import { describe, expect, it } from "vitest";
import { call, configBody, expectApiError } from "./support";

describe("analytics", () => {
  it("analyzes anonymously: aggregates per city and metric, sums only for cumulative metrics", async () => {
    const res = await call("POST", "/analytics/analyze", {
      body: configBody(["lisbon", "london"], "last30", ["temperature", "precipitation", "windSpeed"]),
    });
    expect(res.status).toBe(200);
    expect(res.body.aggregates).toHaveLength(6);
    expect(res.body.trends).toHaveLength(6);
    expect(res.body.insights.length).toBeGreaterThan(0);

    const temperature = res.body.aggregates.find((a: { metric: string }) => a.metric === "temperature");
    const precipitation = res.body.aggregates.find((a: { metric: string }) => a.metric === "precipitation");
    expect(temperature.sum).toBeNull();
    expect(typeof precipitation.sum).toBe("number");
    expect(temperature.min).toBeLessThanOrEqual(temperature.avg);
    expect(temperature.avg).toBeLessThanOrEqual(temperature.max);

    const diffs: number[] = res.body.anomalies.map((a: { difference: number }) => Math.abs(a.difference));
    expect([...diffs].sort((a, b) => b - a)).toEqual(diffs);
  });

  it("validates the configuration", async () => {
    expectApiError(await call("POST", "/analytics/analyze", { body: configBody([])}), 400, "VALIDATION");
    expectApiError(await call("POST", "/analytics/analyze", { body: configBody(["lisbon"], "last7", ["sunshine"]) }), 400, "VALIDATION");
    expectApiError(await call("POST", "/analytics/analyze", { body: configBody(["atlantis"]) }), 404, "NOT_FOUND");
  });
});
