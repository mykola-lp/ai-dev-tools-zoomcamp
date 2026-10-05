import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { call, DEMO, expectApiError, newUser } from "./support";

describe("auth", () => {
  it("registers, returns a token and a SESSION cookie, and the token identifies the user", async () => {
    const email = `it-${randomUUID()}@example.com`;
    const reg = await call("POST", "/auth/register", { body: { email, password: "secret123" } });
    expect(reg.status).toBe(201);
    expect(reg.body).toMatchObject({ email });
    expect(reg.body.token).toBeTruthy();

    const cookie = reg.headers.get("set-cookie") ?? "";
    expect(cookie).toContain("SESSION=");
    expect(cookie.toLowerCase()).toContain("httponly");

    const session = await call("GET", "/auth/session", { token: reg.body.token });
    expect(session.status).toBe(200);
    expect(session.body).toEqual({ id: reg.body.id, email });
  });

  it("rejects duplicate emails (case-insensitive) and invalid credentials", async () => {
    const user = await newUser();
    expectApiError(
      await call("POST", "/auth/register", { body: { email: user.email.toUpperCase(), password: "another1" } }),
      409,
      "CONFLICT",
    );
    expectApiError(await call("POST", "/auth/register", { body: { email: "not-an-email", password: "secret123" } }), 400, "VALIDATION");
    expectApiError(await call("POST", "/auth/register", { body: { email: "a@b.co", password: "123" } }), 400, "VALIDATION");
  });

  it("logs in with the right password and refuses the wrong one", async () => {
    const user = await newUser();
    expectApiError(await call("POST", "/auth/login", { body: { email: user.email, password: "wrong-pass" } }), 401, "UNAUTHORIZED");
    expectApiError(await call("POST", "/auth/login", { body: { email: "nobody@example.com", password: "secret123" } }), 401, "UNAUTHORIZED");

    const ok = await call("POST", "/auth/login", { body: { email: user.email, password: "secret123" } });
    expect(ok.status).toBe(200);
    expect((await call("GET", "/saved-cities", { token: ok.body.token })).status).toBe(200);
  });

  it("logout revokes the token", async () => {
    const user = await newUser();
    expect((await call("GET", "/saved-cities", { token: user.token })).status).toBe(200);
    expect((await call("POST", "/auth/logout", { token: user.token })).status).toBe(204);
    expectApiError(await call("GET", "/saved-cities", { token: user.token }), 401, "UNAUTHORIZED");
  });

  it("session is JSON null for anonymous callers and never 401", async () => {
    const anonymous = await call("GET", "/auth/session");
    expect(anonymous.status).toBe(200);
    expect(anonymous.body).toBeNull();
    const garbage = await call("GET", "/auth/session", { token: "garbage" });
    expect(garbage.status).toBe(200);
    expect(garbage.body).toBeNull();
  });

  it("user-owned endpoints require authentication", async () => {
    for (const path of ["/saved-cities", "/views", "/personal-dashboard", "/history/runs"]) {
      expectApiError(await call("GET", path), 401, "UNAUTHORIZED");
    }
    expectApiError(await call("POST", "/history/runs", { body: {} }), 401, "UNAUTHORIZED");
    // the seeded demo account works with its documented credentials
    expect((await call("POST", "/auth/login", { body: DEMO })).status).toBe(200);
  });
});
