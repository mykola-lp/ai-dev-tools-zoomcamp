import { randomUUID } from "node:crypto";
import { expect } from "vitest";

export const BASE = process.env["IT_BASE_URL"] ?? "http://localhost:19080/api";

export interface Res {
  status: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body: any;
  headers: Headers;
}

export async function call(
  method: string,
  path: string,
  opts: { token?: string; body?: unknown; query?: Record<string, string> } = {},
): Promise<Res> {
  const qs = opts.query ? `?${new URLSearchParams(opts.query).toString()}` : "";
  const headers: Record<string, string> = {};
  if (opts.token) headers["Authorization"] = `Bearer ${opts.token}`;
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";
  const res = await fetch(`${BASE}${path}${qs}`, {
    method,
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : null,
  });
  const text = await res.text();
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }
  return { status: res.status, body, headers: res.headers };
}

export async function newUser() {
  const email = `it-${randomUUID()}@example.com`;
  const res = await call("POST", "/auth/register", { body: { email, password: "secret123" } });
  expect(res.status).toBe(201);
  return { id: res.body.id as string, email, token: res.body.token as string };
}

export const DEMO = { email: "demo@example.com", password: "demo1234" };

export const ERROR_CODES = ["VALIDATION", "UNAUTHORIZED", "FORBIDDEN", "NOT_FOUND", "CONFLICT", "UPSTREAM"];

export function expectApiError(res: Res, status: number, code: string) {
  expect(res.status).toBe(status);
  expect(res.body).toMatchObject({ code });
  expect(typeof res.body.message).toBe("string");
}

/** UTC calendar day relative to today, e.g. isoDay(-1) is yesterday. */
export const isoDay = (offsetDays: number) => new Date(Date.now() + offsetDays * 86_400_000).toISOString().slice(0, 10);

export const DASHBOARD = { chartType: "line", showTable: true, showInsights: true };

export function configBody(cityIds: string[], period = "last7", metrics = ["temperature"]) {
  return { cityIds, period, metrics, dashboard: DASHBOARD };
}

export function viewBody(name: string, visibility: "public" | "private", cityIds = ["lisbon", "london"]) {
  return { name, visibility, ...configBody(cityIds, "last7", ["temperature", "precipitation"]) };
}

export async function createView(token: string, name: string, visibility: "public" | "private", cityIds?: string[]) {
  const res = await call("POST", "/views", { token, body: viewBody(name, visibility, cityIds) });
  expect(res.status).toBe(201);
  return res.body as { id: string; name: string; visibility: string; ownerId: string; cityIds: string[] };
}
