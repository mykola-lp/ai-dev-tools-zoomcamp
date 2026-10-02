// Hybrid analytics model (backend concern; the mock backend runs it).
// Combines historical/seasonal baselines with metric-specific rules.
import type {
  Aggregate,
  AnalysisResult,
  Anomaly,
  City,
  CitySeries,
  Metric,
  Severity,
  Trend,
} from "../types";

interface MetricRule {
  label: string;
  unit: string;
  summable: boolean;
  /** absolute deviation from baseline that counts as an anomaly (medium) */
  anomalyThreshold: number;
  /** slope per day below which a trend is "flat" */
  trendThreshold: number;
  analyzable: boolean;
}

export const METRIC_RULES: Record<Metric, MetricRule> = {
  temperature: { label: "Temperature", unit: "°C", summable: false, anomalyThreshold: 4, trendThreshold: 0.08, analyzable: true },
  apparentTemperature: { label: "Feels like", unit: "°C", summable: false, anomalyThreshold: 5, trendThreshold: 0.1, analyzable: true },
  precipitation: { label: "Precipitation", unit: "mm", summable: true, anomalyThreshold: 3, trendThreshold: 0.1, analyzable: true },
  windSpeed: { label: "Wind", unit: "km/h", summable: false, anomalyThreshold: 8, trendThreshold: 0.25, analyzable: true },
  humidity: { label: "Humidity", unit: "%", summable: false, anomalyThreshold: 15, trendThreshold: 0.5, analyzable: true },
  pressure: { label: "Pressure", unit: "hPa", summable: false, anomalyThreshold: 8, trendThreshold: 0.3, analyzable: true },
  snowfall: { label: "Snowfall", unit: "cm", summable: true, anomalyThreshold: 2, trendThreshold: 0.1, analyzable: true },
  weatherCode: { label: "Weather code", unit: "", summable: false, anomalyThreshold: Infinity, trendThreshold: Infinity, analyzable: false },
};

const round = (n: number, d = 1) => Math.round(n * 10 ** d) / 10 ** d;

export function aggregate(values: number[]): { avg: number; min: number; max: number; sum: number } {
  if (values.length === 0) return { avg: 0, min: 0, max: 0, sum: 0 };
  const sum = values.reduce((a, b) => a + b, 0);
  return { avg: round(sum / values.length), min: round(Math.min(...values)), max: round(Math.max(...values)), sum: round(sum) };
}

/** Least-squares slope (units per index step). */
export function linearSlope(values: number[]): number {
  const n = values.length;
  if (n < 2) return 0;
  const mx = (n - 1) / 2;
  const my = values.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  values.forEach((y, x) => {
    num += (x - mx) * (y - my);
    den += (x - mx) ** 2;
  });
  return den === 0 ? 0 : num / den;
}

export type BaselineFn = (city: City, metric: Metric, date: string) => number;

export function detectAnomaly(city: City, metric: Metric, value: number, baseline: number): Anomaly | null {
  const rule = METRIC_RULES[metric];
  if (!rule.analyzable) return null;
  const difference = round(value - baseline);
  const abs = Math.abs(difference);
  if (abs < rule.anomalyThreshold) return null;
  const severity: Severity = abs >= rule.anomalyThreshold * 2 ? "high" : abs >= rule.anomalyThreshold * 1.4 ? "medium" : "low";
  const dir = difference > 0 ? "above" : "below";
  return {
    type: "anomaly",
    cityId: city.id,
    metric,
    severity,
    value: round(value),
    baseline: round(baseline),
    difference,
    message: `${rule.label} in ${city.name} is ${severity === "high" ? "significantly " : ""}${dir} the seasonal baseline (${round(value)}${rule.unit} vs ${round(baseline)}${rule.unit}).`,
  };
}

export function detectTrend(city: City, metric: Metric, values: number[]): Trend | null {
  const rule = METRIC_RULES[metric];
  if (!rule.analyzable || values.length < 4) return null;
  const slope = linearSlope(values);
  const abs = Math.abs(slope);
  const direction = abs < rule.trendThreshold ? "flat" : slope > 0 ? "up" : "down";
  const strength = abs >= rule.trendThreshold * 3 ? "strong" : abs >= rule.trendThreshold * 1.5 ? "moderate" : "weak";
  const message =
    direction === "flat"
      ? `${rule.label} in ${city.name} is stable over the period.`
      : `${rule.label} in ${city.name} shows a ${strength} ${direction === "up" ? "increasing" : "decreasing"} trend (${slope > 0 ? "+" : ""}${round(slope, 2)}${rule.unit}/day).`;
  return { cityId: city.id, metric, direction, strength, slopePerDay: round(slope, 3), message };
}

export function buildInsights(cities: City[], aggregates: Aggregate[], anomalies: Anomaly[], trends: Trend[]): string[] {
  const out: string[] = [];
  const byId = new Map(cities.map((c) => [c.id, c]));
  const highs = anomalies.filter((a) => a.severity === "high").slice(0, 2);
  highs.forEach((a) => out.push(a.message));
  trends
    .filter((t) => t.direction !== "flat" && t.strength !== "weak")
    .slice(0, 2)
    .forEach((t) => out.push(t.message));

  if (cities.length > 1) {
    const metrics = Array.from(new Set(aggregates.map((a) => a.metric)));
    for (const m of metrics) {
      const rule = METRIC_RULES[m];
      if (!rule.analyzable) continue;
      const list = aggregates.filter((a) => a.metric === m).sort((a, b) => b.avg - a.avg);
      if (list.length < 2) continue;
      const top = list[0]!;
      const bottom = list[list.length - 1]!;
      const gap = round(top.avg - bottom.avg);
      if (Math.abs(gap) >= rule.anomalyThreshold * 0.75) {
        out.push(
          `${byId.get(top.cityId)?.name} averages ${gap}${rule.unit} more ${rule.label.toLowerCase()} than ${byId.get(bottom.cityId)?.name}.`,
        );
      }
    }
  }
  if (out.length === 0) out.push("Conditions are within normal seasonal ranges for all selected cities.");
  return out.slice(0, 6);
}

export function analyze(cities: City[], series: CitySeries[], metrics: Metric[], baseline: BaselineFn): AnalysisResult {
  const aggregates: Aggregate[] = [];
  const anomalies: Anomaly[] = [];
  const trends: Trend[] = [];
  for (const city of cities) {
    const s = series.find((x) => x.cityId === city.id);
    if (!s || s.points.length === 0) continue;
    for (const metric of metrics) {
      const values = s.points.map((p) => p.values[metric]);
      const agg = aggregate(values);
      aggregates.push({ cityId: city.id, metric, ...agg, sum: METRIC_RULES[metric].summable ? agg.sum : null });
      const base = s.points.map((p) => baseline(city, metric, p.date));
      const baseAvg = base.reduce((a, b) => a + b, 0) / base.length;
      const an = detectAnomaly(city, metric, agg.avg, baseAvg);
      if (an) anomalies.push(an);
      const tr = detectTrend(city, metric, values);
      if (tr) trends.push(tr);
    }
  }
  anomalies.sort((a, b) => Math.abs(b.difference) - Math.abs(a.difference));
  return { aggregates, anomalies, trends, insights: buildInsights(cities, aggregates, anomalies, trends) };
}
