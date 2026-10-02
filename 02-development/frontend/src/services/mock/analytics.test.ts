import { describe, expect, it } from "vitest";
import { aggregate, analyze, detectAnomaly, detectTrend, linearSlope } from "./analytics";
import type { City, CitySeries, MetricValues } from "../types";

const city: City = { id: "x", name: "Testville", country: "T", lat: 45, lon: 0 };
const vals = (t: number): MetricValues => ({
  temperature: t, apparentTemperature: t, precipitation: 1, windSpeed: 10, humidity: 60, pressure: 1013, snowfall: 0, weatherCode: 0,
});

describe("analytics", () => {
  it("aggregates avg/min/max/sum", () => {
    expect(aggregate([1, 2, 3, 6])).toEqual({ avg: 3, min: 1, max: 6, sum: 12 });
  });

  it("computes linear slope", () => {
    expect(linearSlope([0, 1, 2, 3])).toBeCloseTo(1);
    expect(linearSlope([5, 5, 5])).toBe(0);
  });

  it("flags anomalies relative to baseline with severity", () => {
    const a = detectAnomaly(city, "temperature", 17, 9);
    expect(a?.severity).toBe("high");
    expect(a?.difference).toBe(8);
    expect(detectAnomaly(city, "temperature", 11, 10)).toBeNull();
  });

  it("uses metric-specific rules (same diff, different meaning)", () => {
    expect(detectAnomaly(city, "temperature", 15, 10)).not.toBeNull();
    expect(detectAnomaly(city, "humidity", 65, 60)).toBeNull();
  });

  it("detects trend direction", () => {
    expect(detectTrend(city, "temperature", [10, 11, 12, 13, 14])?.direction).toBe("up");
    expect(detectTrend(city, "temperature", [10, 10, 10, 10])?.direction).toBe("flat");
    expect(detectTrend(city, "weatherCode", [0, 1, 2, 3])).toBeNull();
  });

  it("produces insights including city differences", () => {
    const other: City = { ...city, id: "y", name: "Coldtown" };
    const series: CitySeries[] = [
      { cityId: "x", points: Array.from({ length: 5 }, (_, i) => ({ date: `2026-01-0${i + 1}`, values: vals(20) })) },
      { cityId: "y", points: Array.from({ length: 5 }, (_, i) => ({ date: `2026-01-0${i + 1}`, values: vals(5) })) },
    ];
    const r = analyze([city, other], series, ["temperature"], () => 12);
    expect(r.aggregates).toHaveLength(2);
    expect(r.anomalies.length).toBe(2);
    expect(r.insights.some((s) => s.includes("Testville") && s.includes("Coldtown"))).toBe(true);
  });
});
