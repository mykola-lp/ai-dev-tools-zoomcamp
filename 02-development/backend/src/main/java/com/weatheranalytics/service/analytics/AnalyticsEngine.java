package com.weatheranalytics.service.analytics;

import com.weatheranalytics.api.dto.Aggregate;
import com.weatheranalytics.api.dto.AnalysisResult;
import com.weatheranalytics.api.dto.Anomaly;
import com.weatheranalytics.api.dto.City;
import com.weatheranalytics.api.dto.Trend;
import com.weatheranalytics.domain.CitySeriesData;
import com.weatheranalytics.domain.DailyPoint;
import com.weatheranalytics.domain.Metric;
import com.weatheranalytics.domain.Severity;
import com.weatheranalytics.domain.TrendDirection;
import com.weatheranalytics.domain.TrendStrength;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.function.Function;
import java.util.function.ToDoubleFunction;
import java.util.stream.Collectors;
import java.util.stream.DoubleStream;
import org.springframework.stereotype.Component;

/**
 * Pure analytics over daily series: aggregates, anomalies, trends and textual insights.
 * No I/O, no clock - the same input always yields the same result.
 *
 * <ul>
 *   <li><b>Aggregates</b>: avg/min/max, plus a sum for cumulative metrics (precipitation, snowfall).</li>
 *   <li><b>Anomalies</b>: each day is compared with the mean of all <i>other</i> days of the series; it is an
 *       anomaly when it deviates by at least 2 standard deviations (of the other days) <i>and</i> by at least the
 *       metric's minimum absolute difference (so that e.g. 0.3 mm of rain after a dry spell is not reported).</li>
 *   <li><b>Trends</b>: least-squares slope per day; "flat" when the total change over the period is below the
 *       metric's threshold, otherwise strength follows R&sup2;.</li>
 * </ul>
 * Weather codes are categorical and only get aggregates.
 */
@Component
public class AnalyticsEngine {

    static final int MAX_ANOMALIES = 50;
    static final int MIN_POINTS_FOR_ANOMALIES = 4;
    static final int MIN_POINTS_FOR_TREND = 3;
    static final double MIN_Z_SCORE = 2.0;
    private static final int MAX_INSIGHTS = 10;

    public AnalysisResult analyze(List<City> cities, List<CitySeriesData> series, List<Metric> metrics) {
        Map<String, City> cityById = cities.stream()
                .collect(Collectors.toMap(City::id, Function.identity(), (a, b) -> a));

        List<Aggregate> aggregates = new ArrayList<>();
        List<Anomaly> anomalies = new ArrayList<>();
        List<Trend> trends = new ArrayList<>();

        for (CitySeriesData cityData : series) {
            City city = cityById.get(cityData.cityId());
            List<DailyPoint> points = cityData.points();
            if (city == null || points.isEmpty()) {
                continue;
            }
            for (Metric metric : metrics) {
                double[] values = points.stream().mapToDouble(p -> metric.extract(p.values())).toArray();
                aggregates.add(aggregate(city, metric, values));
                if (!metric.categorical()) {
                    anomalies.addAll(detectAnomalies(city, metric, points, values));
                    trends.add(detectTrend(city, metric, values));
                }
            }
        }

        anomalies.sort(Comparator.comparingDouble((Anomaly a) -> Math.abs(a.difference())).reversed());
        List<Anomaly> topAnomalies = anomalies.size() > MAX_ANOMALIES
                ? List.copyOf(anomalies.subList(0, MAX_ANOMALIES)) : List.copyOf(anomalies);

        return new AnalysisResult(List.copyOf(aggregates), topAnomalies, List.copyOf(trends),
                insights(cityById, metrics, aggregates, topAnomalies, trends));
    }

    // ------------------------------------------------------------- aggregates

    private static Aggregate aggregate(City city, Metric metric, double[] values) {
        double sum = DoubleStream.of(values).sum();
        return new Aggregate(city.id(), metric,
                round(sum / values.length, 2),
                round(DoubleStream.of(values).min().orElse(0), 2),
                round(DoubleStream.of(values).max().orElse(0), 2),
                metric.summable() ? round(sum, 2) : null);
    }

    // -------------------------------------------------------------- anomalies

    private static List<Anomaly> detectAnomalies(City city, Metric metric, List<DailyPoint> points, double[] values) {
        int n = values.length;
        if (n < MIN_POINTS_FOR_ANOMALIES) {
            return List.of();
        }
        double sum = DoubleStream.of(values).sum();
        double sumOfSquares = DoubleStream.of(values).map(v -> v * v).sum();
        double minDiff = metric.anomalyMinDiff();
        int others = n - 1;

        List<Anomaly> found = new ArrayList<>();
        for (int i = 0; i < n; i++) {
            double value = values[i];
            double baseline = (sum - value) / others;
            double variance = Math.max(0, (sumOfSquares - value * value) / others - baseline * baseline);
            double deviation = Math.max(Math.sqrt(variance), minDiff / 2); // floor avoids division by ~0
            double difference = value - baseline;
            double z = Math.abs(difference) / deviation;
            if (z >= MIN_Z_SCORE && Math.abs(difference) >= minDiff) {
                Severity severity = z >= 4 ? Severity.HIGH : z >= 3 ? Severity.MEDIUM : Severity.LOW;
                found.add(Anomaly.of(city.id(), metric, severity, round(value, 2), round(baseline, 2),
                        round(difference, 2), anomalyMessage(city, metric, points.get(i).date(), value, baseline, difference)));
            }
        }
        return found;
    }

    private static String anomalyMessage(City city, Metric metric, LocalDate date, double value, double baseline,
                                         double difference) {
        return String.format(Locale.ROOT, "%s: unusually %s %s on %s - %s, %s %s the typical %s",
                city.name(), difference > 0 ? "high" : "low", metric.label(), date,
                withUnit(value, metric), withUnit(Math.abs(difference), metric),
                difference > 0 ? "above" : "below", withUnit(baseline, metric));
    }

    // ----------------------------------------------------------------- trends

    private static Trend detectTrend(City city, Metric metric, double[] values) {
        int n = values.length;
        if (n < MIN_POINTS_FOR_TREND) {
            return flat(city, metric, 0);
        }
        double meanX = (n - 1) / 2.0;
        double meanY = DoubleStream.of(values).average().orElse(0);
        double sxx = 0;
        double sxy = 0;
        double syy = 0;
        for (int i = 0; i < n; i++) {
            double dx = i - meanX;
            double dy = values[i] - meanY;
            sxx += dx * dx;
            sxy += dx * dy;
            syy += dy * dy;
        }
        double slope = sxy / sxx;
        double rSquared = syy == 0 ? 0 : (sxy * sxy) / (sxx * syy);
        double totalChange = slope * (n - 1);

        if (Math.abs(totalChange) < metric.trendMinChange()) {
            return flat(city, metric, slope);
        }
        TrendDirection direction = totalChange > 0 ? TrendDirection.UP : TrendDirection.DOWN;
        TrendStrength strength = rSquared >= 0.6 ? TrendStrength.STRONG
                : rSquared >= 0.3 ? TrendStrength.MODERATE : TrendStrength.WEAK;
        String message = String.format(Locale.ROOT, "%s: %s is trending %s (%+.2f %s/day, %s trend)",
                city.name(), metric.label(), direction.value(), slope, unitOrBlank(metric), strength.value());
        return new Trend(city.id(), metric, direction, strength, round(slope, 3), message);
    }

    private static Trend flat(City city, Metric metric, double slope) {
        return new Trend(city.id(), metric, TrendDirection.FLAT, TrendStrength.WEAK, round(slope, 3),
                city.name() + ": " + metric.label() + " is stable over the period");
    }

    // --------------------------------------------------------------- insights

    private static List<String> insights(Map<String, City> cityById, List<Metric> metrics, List<Aggregate> aggregates,
                                         List<Anomaly> anomalies, List<Trend> trends) {
        List<String> out = new ArrayList<>();
        for (Metric metric : metrics) {
            if (metric.categorical()) {
                continue;
            }
            List<Aggregate> ofMetric = aggregates.stream().filter(a -> a.metric() == metric).toList();
            if (ofMetric.isEmpty()) {
                continue;
            }
            String basis = metric.summable() ? "total" : "average";
            ToDoubleFunction<Aggregate> measure = metric.summable() ? a -> a.sum() : Aggregate::avg;
            Aggregate highest = ofMetric.stream().max(Comparator.comparingDouble(measure)).orElseThrow();
            Aggregate lowest = ofMetric.stream().min(Comparator.comparingDouble(measure)).orElseThrow();
            if (ofMetric.size() == 1) {
                out.add(String.format(Locale.ROOT, "%s: %s %s is %s (daily range %s to %s).",
                        cityName(cityById, highest), basis, metric.label(), withUnit(measure.applyAsDouble(highest), metric),
                        withUnit(highest.min(), metric), withUnit(highest.max(), metric)));
            } else if (measure.applyAsDouble(highest) != measure.applyAsDouble(lowest)) {
                out.add(String.format(Locale.ROOT, "Highest %s %s: %s (%s); lowest: %s (%s).",
                        basis, metric.label(),
                        cityName(cityById, highest), withUnit(measure.applyAsDouble(highest), metric),
                        cityName(cityById, lowest), withUnit(measure.applyAsDouble(lowest), metric)));
            }
        }
        if (anomalies.isEmpty()) {
            out.add("No significant anomalies detected.");
        } else {
            out.add(String.format(Locale.ROOT, "%d anomal%s detected; most notable: %s.", anomalies.size(),
                    anomalies.size() == 1 ? "y" : "ies", anomalies.get(0).message()));
        }
        trends.stream()
                .filter(t -> t.strength() == TrendStrength.STRONG && t.direction() != TrendDirection.FLAT)
                .limit(3)
                .forEach(t -> out.add("Notable trend - " + t.message() + "."));
        return List.copyOf(out.size() > MAX_INSIGHTS ? out.subList(0, MAX_INSIGHTS) : out);
    }

    // ---------------------------------------------------------------- helpers

    private static String cityName(Map<String, City> cityById, Aggregate aggregate) {
        City city = cityById.get(aggregate.cityId());
        return city == null ? aggregate.cityId() : city.name();
    }

    private static String withUnit(double value, Metric metric) {
        String number = String.format(Locale.ROOT, "%.1f", value);
        return metric.unit().isEmpty() ? number : number + " " + metric.unit();
    }

    private static String unitOrBlank(Metric metric) {
        return metric.unit();
    }

    static double round(double value, int places) {
        double factor = Math.pow(10, places);
        return Math.round(value * factor) / factor;
    }
}
