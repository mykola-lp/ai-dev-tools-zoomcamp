package com.weatheranalytics.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.weatheranalytics.api.dto.Aggregate;
import com.weatheranalytics.api.dto.AnalysisResult;
import com.weatheranalytics.api.dto.City;
import com.weatheranalytics.api.dto.Trend;
import com.weatheranalytics.domain.CitySeriesData;
import com.weatheranalytics.domain.DailyPoint;
import com.weatheranalytics.domain.Metric;
import com.weatheranalytics.domain.Severity;
import com.weatheranalytics.domain.TrendDirection;
import com.weatheranalytics.domain.TrendStrength;
import com.weatheranalytics.service.analytics.AnalyticsEngine;
import com.weatheranalytics.support.StubWeatherProvider;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.function.IntToDoubleFunction;
import org.junit.jupiter.api.Test;

class AnalyticsEngineTest {

    private final AnalyticsEngine engine = new AnalyticsEngine();
    private final City lisbon = new City("lisbon", "Lisbon", "Portugal", 38.7, -9.1);
    private final City london = new City("london", "London", "United Kingdom", 51.5, -0.1);

    private static CitySeriesData series(String cityId, int days, IntToDoubleFunction temp, IntToDoubleFunction rain) {
        List<DailyPoint> points = new ArrayList<>();
        for (int i = 0; i < days; i++) {
            points.add(new DailyPoint(LocalDate.of(2026, 6, 1).plusDays(i),
                    StubWeatherProvider.values(temp.applyAsDouble(i), rain.applyAsDouble(i))));
        }
        return new CitySeriesData(cityId, points);
    }

    @Test
    void aggregatesHaveSumOnlyForCumulativeMetrics() {
        var s = series("lisbon", 10, i -> 10 + i, i -> 2);
        AnalysisResult result = engine.analyze(List.of(lisbon), List.of(s), List.of(Metric.TEMPERATURE, Metric.PRECIPITATION));

        Aggregate temp = result.aggregates().get(0);
        assertThat(temp.metric()).isEqualTo(Metric.TEMPERATURE);
        assertThat(temp.avg()).isEqualTo(14.5);
        assertThat(temp.min()).isEqualTo(10);
        assertThat(temp.max()).isEqualTo(19);
        assertThat(temp.sum()).isNull();

        Aggregate rain = result.aggregates().get(1);
        assertThat(rain.sum()).isEqualTo(20.0);
    }

    @Test
    void spikeIsReportedAsHighSeverityAnomaly() {
        var s = series("lisbon", 10, i -> i == 5 ? 30 : 10, i -> 0);
        AnalysisResult result = engine.analyze(List.of(lisbon), List.of(s), List.of(Metric.TEMPERATURE));

        assertThat(result.anomalies()).hasSize(1);
        var anomaly = result.anomalies().get(0);
        assertThat(anomaly.type()).isEqualTo("anomaly");
        assertThat(anomaly.severity()).isEqualTo(Severity.HIGH);
        assertThat(anomaly.value()).isEqualTo(30.0);
        assertThat(anomaly.baseline()).isEqualTo(10.0);
        assertThat(anomaly.difference()).isEqualTo(20.0);
        assertThat(anomaly.message()).contains("Lisbon").contains("2026-06-06");
    }

    @Test
    void smoothLinearSeriesHasNoAnomaliesAndAStrongUpwardTrend() {
        var s = series("lisbon", 10, i -> i, i -> 0);
        AnalysisResult result = engine.analyze(List.of(lisbon), List.of(s), List.of(Metric.TEMPERATURE));

        assertThat(result.anomalies()).isEmpty();
        Trend trend = result.trends().get(0);
        assertThat(trend.direction()).isEqualTo(TrendDirection.UP);
        assertThat(trend.strength()).isEqualTo(TrendStrength.STRONG);
        assertThat(trend.slopePerDay()).isEqualTo(1.0);
    }

    @Test
    void constantSeriesIsFlat() {
        var s = series("lisbon", 10, i -> 10, i -> 0);
        Trend trend = engine.analyze(List.of(lisbon), List.of(s), List.of(Metric.TEMPERATURE)).trends().get(0);
        assertThat(trend.direction()).isEqualTo(TrendDirection.FLAT);
    }

    @Test
    void anomaliesAreSortedByAbsoluteDifferenceDescending() {
        var s = series("lisbon", 20, i -> i == 3 ? 25 : i == 12 ? -20 : 10, i -> 0);
        var anomalies = engine.analyze(List.of(lisbon), List.of(s), List.of(Metric.TEMPERATURE)).anomalies();
        assertThat(anomalies).hasSize(2);
        assertThat(Math.abs(anomalies.get(0).difference())).isGreaterThan(Math.abs(anomalies.get(1).difference()));
    }

    @Test
    void weatherCodeGetsAggregatesButNoAnomaliesOrTrends() {
        var s = series("lisbon", 10, i -> 10, i -> 0);
        AnalysisResult result = engine.analyze(List.of(lisbon), List.of(s), List.of(Metric.WEATHER_CODE));
        assertThat(result.aggregates()).hasSize(1);
        assertThat(result.trends()).isEmpty();
        assertThat(result.anomalies()).isEmpty();
    }

    @Test
    void insightsCompareCitiesAndMentionAnomalyStatus() {
        var warm = series("lisbon", 10, i -> 20, i -> 0);
        var cold = series("london", 10, i -> 8, i -> 0);
        AnalysisResult result = engine.analyze(List.of(lisbon, london), List.of(warm, cold), List.of(Metric.TEMPERATURE));
        assertThat(result.insights()).anyMatch(s -> s.contains("Highest average temperature: Lisbon")
                && s.contains("lowest: London"));
        assertThat(result.insights()).contains("No significant anomalies detected.");
    }
}
