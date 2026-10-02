import { beforeEach, describe, expect, it } from "vitest";
import { createMockApi, DEFAULT_VIEW_CONFIG, memoryStore, type KeyValueStore } from "./mockApi";
import type { WeatherApi } from "../types";

let store: KeyValueStore;
let api: WeatherApi;
let clock: number;

beforeEach(() => {
  store = memoryStore();
  clock = Date.parse("2026-06-15T12:00:00Z");
  api = createMockApi({ store, now: () => clock });
});

describe("mock API", () => {
  it("lets anonymous users explore but not persist", async () => {
    expect(await api.auth.getSession()).toBeNull();
    expect((await api.cities.search("lis"))[0]?.id).toBe("lisbon");
    const series = await api.weather.getSeries(["lisbon"], "last7");
    expect(series[0]?.points).toHaveLength(7);
    await expect(api.views.create({ ...DEFAULT_VIEW_CONFIG, name: "x", visibility: "private" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(api.savedCities.add("lisbon")).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("gives new users a default view, then their last saved view", async () => {
    await api.auth.register("a@b.co", "secret1");
    const first = await api.views.getPersonalDashboard();
    expect(first.source).toBe("default");
    const v1 = await api.views.create({ ...DEFAULT_VIEW_CONFIG, name: "One", visibility: "private" });
    clock += 1000;
    const v2 = await api.views.create({ ...DEFAULT_VIEW_CONFIG, cityIds: ["tokyo"], name: "Two", visibility: "private" });
    const next = await api.views.getPersonalDashboard();
    expect(next.source === "saved" && next.view.id).toBe(v2.id);
    clock += 1000;
    await api.views.update(v1.id, { name: "One edited" });
    const after = await api.views.getPersonalDashboard();
    expect(after.source === "saved" && after.view.id).toBe(v1.id);
  });

  it("enforces visibility and ownership", async () => {
    await api.auth.register("owner@x.co", "secret1");
    const priv = await api.views.create({ ...DEFAULT_VIEW_CONFIG, name: "P", visibility: "private" });
    const pub = await api.views.create({ ...DEFAULT_VIEW_CONFIG, name: "Q", visibility: "public" });
    await api.auth.logout();

    await expect(api.views.get(priv.id)).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect((await api.views.get(pub.id)).name).toBe("Q");

    await api.auth.register("other@x.co", "secret1");
    await expect(api.views.update(pub.id, { name: "hack" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(api.views.remove(pub.id)).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("keeps saved cities independent of views", async () => {
    await api.auth.register("c@x.co", "secret1");
    await api.savedCities.add("oslo");
    await api.savedCities.add("oslo");
    expect((await api.savedCities.list()).map((c) => c.id)).toEqual(["oslo"]);
    const d = await api.views.getPersonalDashboard();
    expect(d.source === "default" && d.config.cityIds).toEqual(["oslo"]);
  });

  it("stores immutable analysis runs", async () => {
    await api.auth.register("r@x.co", "secret1");
    const view = await api.views.create({ ...DEFAULT_VIEW_CONFIG, name: "V", visibility: "private" });
    const run = await api.history.run(view);
    await api.views.update(view.id, { cityIds: ["tokyo"], period: "last7" });
    await api.weather.refresh("historical");
    const stored = await api.history.get(run.id);
    expect(stored.config.cityIds).toEqual(DEFAULT_VIEW_CONFIG.cityIds);
    expect(stored.result).toEqual(run.result);
    const run2 = await api.history.run({ ...view, cityIds: ["tokyo"] });
    expect(run2.id).not.toBe(run.id);
    expect(await api.history.list()).toHaveLength(2);
  });

  it("applies a refresh policy: recent data is served from cache", async () => {
    const r1 = await api.weather.refresh("current");
    expect(r1.fetchedFromSource).toBe(true);
    const r2 = await api.weather.refresh("current");
    expect(r2.fetchedFromSource).toBe(false);
    clock += 10 * 60_000;
    expect((await api.weather.refresh("current")).fetchedFromSource).toBe(true);
  });

  it("reports failures from the provider", async () => {
    const flaky = createMockApi({ store: memoryStore(), refreshFailureRate: 1 });
    await expect(flaky.weather.refresh("forecast")).rejects.toMatchObject({ code: "UPSTREAM" });
  });

  it("validates credentials", async () => {
    await expect(api.auth.register("bad", "secret1")).rejects.toMatchObject({ code: "VALIDATION" });
    await api.auth.register("z@x.co", "secret1");
    await api.auth.logout();
    await expect(api.auth.login("z@x.co", "wrong")).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect((await api.auth.login("z@x.co", "secret1")).email).toBe("z@x.co");
  });
});
