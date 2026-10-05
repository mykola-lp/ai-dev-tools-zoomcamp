import { readFileSync } from "node:fs";
import YAML from "yaml";
import { describe, expect, it } from "vitest";
import { call, ERROR_CODES, expectApiError, newUser } from "./support";

/* eslint-disable @typescript-eslint/no-explicit-any */
const spec: any = YAML.parse(readFileSync(new URL("../../openapi.yaml", import.meta.url), "utf8"));
const METHODS = ["get", "post", "put", "patch", "delete"];

function resolve(param: any): any {
  if (!param?.["$ref"]) return param;
  const name = String(param["$ref"]).split("/").pop()!;
  return spec.components.parameters[name];
}

describe("contract (openapi.yaml)", () => {
  it("every documented operation is served by the backend with a documented kind of response", async () => {
    const problems: string[] = [];
    let operations = 0;

    for (const [path, item] of Object.entries<any>(spec.paths)) {
      for (const method of METHODS) {
        const op = item[method];
        if (!op) continue;
        operations += 1;

        const params = [...(item.parameters ?? []), ...(op.parameters ?? [])].map(resolve);
        const query: Record<string, string> = {};
        for (const p of params) {
          if (p.in === "query" && p.required) query[p.name] = p.name === "period" ? "last7" : "x";
        }
        const url = path.replace(/\{[^}]+\}/g, "x");
        const hasBody = ["post", "put", "patch"].includes(method);
        const res = await call(method.toUpperCase(), url, hasBody ? { body: {}, query } : { query });

        const label = `${method.toUpperCase()} ${path} -> ${res.status}`;
        if (res.status === 405) problems.push(`${label} (method not routed)`);
        else if (res.status === 404 && res.body?.code !== "NOT_FOUND") problems.push(`${label} (route missing)`);
        else if (res.status >= 500 && res.status !== 502) problems.push(`${label} (server error)`);
      }
    }

    expect(operations).toBeGreaterThanOrEqual(20);
    expect(problems).toEqual([]);
  });

  it("every error uses the single ApiError shape with the documented HTTP mapping", async () => {
    const me = await newUser();
    const pubOwner = await newUser();
    const created = await call("POST", "/views", {
      token: pubOwner.token,
      body: { name: "P", visibility: "public", cityIds: ["lisbon"], period: "last7", metrics: ["temperature"], dashboard: { chartType: "line", showTable: true, showInsights: true } },
    });

    const cases: [string, number, string, Awaited<ReturnType<typeof call>>][] = [
      ["validation", 400, "VALIDATION", await call("POST", "/auth/register", { body: { email: "x", password: "1" } })],
      ["unauthorized", 401, "UNAUTHORIZED", await call("GET", "/views")],
      ["forbidden", 403, "FORBIDDEN", await call("PATCH", `/views/${created.body.id}`, { token: me.token, body: { name: "x" } })],
      ["not found", 404, "NOT_FOUND", await call("GET", "/views/does-not-exist")],
      ["conflict", 409, "CONFLICT", await call("POST", "/auth/register", { body: { email: me.email, password: "secret123" } })],
      ["upstream", 502, "UPSTREAM", await call("POST", "/weather/refresh/forecast")],
    ];

    for (const [, status, code, res] of cases) {
      expectApiError(res, status, code);
      expect(ERROR_CODES).toContain(res.body.code);
      expect(Object.keys(res.body).sort()).toEqual(["code", "message"]);
    }
  });
});
