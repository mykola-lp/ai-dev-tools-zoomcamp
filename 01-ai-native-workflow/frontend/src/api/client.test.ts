import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { apiFetch, ApiError, setToken } from "./client";

describe("apiFetch", () => {
  beforeEach(() => {
    setToken(null);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns parsed JSON on success", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ status: "ok" }),
      }),
    );

    const result = await apiFetch<{ status: string }>("/health");

    expect(result).toEqual({ status: "ok" });
  });

  it("adds the bearer header when a token is set", async () => {
    setToken("abc123");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({}),
    });
    vi.stubGlobal("fetch", fetchMock);

    await apiFetch("/me");

    const [, options] = fetchMock.mock.calls[0];
    const headers = options.headers as Headers;
    expect(headers.get("Authorization")).toBe("Bearer abc123");
  });

  it("does not add an Authorization header when no token is set", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({}),
    });
    vi.stubGlobal("fetch", fetchMock);

    await apiFetch("/health");

    const [, options] = fetchMock.mock.calls[0];
    const headers = options.headers as Headers;
    expect(headers.has("Authorization")).toBe(false);
  });

  it("throws ApiError with status and detail on a 4xx response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => ({ detail: "Not found" }),
      }),
    );

    await expect(apiFetch("/missing")).rejects.toMatchObject(
      new ApiError(404, { detail: "Not found" }),
    );
  });
});
