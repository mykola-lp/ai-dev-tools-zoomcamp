import { describe, expect, it } from "vitest";
import { call, expectApiError, isoDay } from "./support";

const METRICS = ["temperature", "apparentTemperature", "precipitation", "windSpeed", "humidity", "pressure", "snowfall", "weatherCode"];

describe("cities and weather", () => {
  it("searches by name and country, caps at 8 and returns [] for blank queries", async () => {
    const lis = await call("GET", "/cities", { query: { q: "lis" } });
    expect(lis.body[0]).toMatchObject({ id: "lisbon", name: "Lisbon", country: "Portugal" });
    expect(typeof lis.body[0].lat).toBe("number");
    expect((await call("GET", "/cities", { query: { q: "ukraine" } })).body).toHaveLength(2);
    expect((await call("GET", "/cities", { query: { q: "o" } })).body).toHaveLength(8);
    expect((await call("GET", "/cities", { query: { q: "  " } })).body).toEqual([]);
  });

  it("looks cities up in the requested order and reports unknown ids", async () => {
    const res = await call("GET", "/cities/lookup", { query: { ids: "london,lisbon" } });
    expect(res.body.map((c: { id: string }) => c.id)).toEqual(["london", "lisbon"]);
    expectApiError(await call("GET", "/cities/lookup", { query: { ids: "lisbon,atlantis" } }), 404, "NOT_FOUND");
  });

  it("lists map cities", async () => {
    const res = await call("GET", "/cities/map");
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(10);
    expect(res.body.every((c: { id: string; lat: number; lon: number }) => c.id && typeof c.lat === "number" && typeof c.lon === "number")).toBe(true);
  });

  it("returns a historical series that ends yesterday with every metric", async () => {
    const res = await call("GET", "/weather/series", { query: { cityIds: "lisbon,london", period: "last7" } });
    expect(res.status).toBe(200);
    expect(res.body.map((s: { cityId: string }) => s.cityId)).toEqual(["lisbon", "london"]);
    for (const series of res.body) {
      expect(series.points).toHaveLength(7);
      expect(series.points[0].date).toBe(isoDay(-7));
      expect(series.points[6].date).toBe(isoDay(-1));
      for (const metric of METRICS) expect(typeof series.points[0].values[metric]).toBe("number");
    }
  });

  it("returns a forecast series that starts tomorrow", async () => {
    const res = await call("GET", "/weather/series", { query: { cityIds: "kyiv", period: "next14" } });
    expect(res.body[0].points).toHaveLength(14);
    expect(res.body[0].points[0].date).toBe(isoDay(1));
    expect(res.body[0].points[13].date).toBe(isoDay(14));
  });

  it("returns current weather in request order and three freshness entries", async () => {
    const current = await call("GET", "/weather/current", { query: { cityIds: "paris,rome" } });
    expect(current.body.map((c: { cityId: string }) => c.cityId)).toEqual(["paris", "rome"]);
    expect(typeof current.body[0].values.temperature).toBe("number");
    expect(Number.isNaN(Date.parse(current.body[0].observedAt))).toBe(false);

    const freshness = await call("GET", "/weather/freshness");
    expect(freshness.body.map((f: { category: string }) => f.category)).toEqual(["current", "forecast", "historical"]);
  });

  it("maps an unreachable weather provider to 502 UPSTREAM and keeps serving cached data", async () => {
    expectApiError(await call("POST", "/weather/refresh/historical"), 502, "UPSTREAM");
    expectApiError(await call("POST", "/weather/refresh/current"), 502, "UPSTREAM");
    const cached = await call("GET", "/weather/series", { query: { cityIds: "paris", period: "last30" } });
    expect(cached.status).toBe(200);
    expect(cached.body[0].points).toHaveLength(30);
  });

  it("validates period, category and required parameters", async () => {
    expectApiError(await call("GET", "/weather/series", { query: { cityIds: "lisbon", period: "last3" } }), 400, "VALIDATION");
    expectApiError(await call("GET", "/weather/series", { query: { period: "last7" } }), 400, "VALIDATION");
    expectApiError(await call("GET", "/weather/series", { query: { cityIds: "atlantis", period: "last7" } }), 404, "NOT_FOUND");
    expectApiError(await call("POST", "/weather/refresh/bogus"), 400, "VALIDATION");
  });
});
