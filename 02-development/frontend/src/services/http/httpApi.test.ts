import { afterEach, describe, expect, it, vi } from "vitest";
import { createHttpApi } from "./httpApi";

function mockFetch(status: number, body: unknown) {
  const fn = vi.fn().mockResolvedValue(new Response(body === undefined ? null : JSON.stringify(body), { status }));
  vi.stubGlobal("fetch", fn);
  return fn;
}

afterEach(() => vi.unstubAllGlobals());

describe("http API", () => {
  it("sends comma-separated ids and the period to /api/weather/series", async () => {
    const fetchFn = mockFetch(200, []);
    await createHttpApi().weather.getSeries(["lisbon", "london"], "last7");
    const url = String(fetchFn.mock.calls[0]?.[0]);
    expect(url).toContain("/api/weather/series?");
    expect(decodeURIComponent(url)).toContain("cityIds=lisbon,london");
    expect(url).toContain("period=last7");
  });

  it("returns null for an anonymous session", async () => {
    mockFetch(200, null);
    expect(await createHttpApi().auth.getSession()).toBeNull();
  });

  it("maps backend error bodies to ApiError", async () => {
    mockFetch(409, { code: "CONFLICT", message: "Email is already registered" });
    await expect(createHttpApi().auth.register("a@b.co", "secret1")).rejects.toMatchObject({
      code: "CONFLICT",
      message: "Email is already registered",
    });
  });

  it("falls back to the HTTP status when the body is not an ApiError", async () => {
    mockFetch(401, undefined);
    await expect(createHttpApi().views.list()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("handles 204 without a body", async () => {
    mockFetch(204, undefined);
    await expect(createHttpApi().views.remove("x")).resolves.toBeUndefined();
  });

  it("reports an unreachable server as UPSTREAM", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("fetch failed")));
    await expect(createHttpApi().cities.listMapCities()).rejects.toMatchObject({ code: "UPSTREAM" });
  });
});
