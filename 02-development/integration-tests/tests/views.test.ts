import { describe, expect, it } from "vitest";
import { call, createView, expectApiError, newUser, viewBody } from "./support";

describe("views, saved cities and personal dashboard", () => {
  it("creates views, names blanks 'Untitled view' and lists the most recently updated first", async () => {
    const me = await newUser();
    const blank = await call("POST", "/views", { token: me.token, body: viewBody("   ", "private", ["lisbon"]) });
    expect(blank.status).toBe(201);
    expect(blank.body.name).toBe("Untitled view");
    expect(blank.body.ownerId).toBe(me.id);

    const a = await createView(me.token, "A", "private");
    const b = await createView(me.token, "B", "private");
    expect((await call("GET", "/views", { token: me.token })).body[0].id).toBe(b.id);
    await call("PATCH", `/views/${a.id}`, { token: me.token, body: { name: "A2" } });
    const list = await call("GET", "/views", { token: me.token });
    expect(list.body[0].id).toBe(a.id);
    expect(list.body).toHaveLength(3);
  });

  it("enforces visibility: public is open, private is hidden as 404", async () => {
    const owner = await newUser();
    const other = await newUser();
    const pub = await createView(owner.token, "Public", "public");
    const priv = await createView(owner.token, "Private", "private");

    expect((await call("GET", `/views/${pub.id}`)).status).toBe(200);
    expect((await call("GET", `/views/${pub.id}`, { token: other.token })).status).toBe(200);
    expectApiError(await call("GET", `/views/${priv.id}`), 404, "NOT_FOUND");
    expectApiError(await call("GET", `/views/${priv.id}`, { token: other.token }), 404, "NOT_FOUND");
    expect((await call("GET", `/views/${priv.id}`, { token: owner.token })).status).toBe(200);
    expect((await call("GET", "/views", { token: other.token })).body).toEqual([]);
  });

  it("enforces ownership on update and delete", async () => {
    const owner = await newUser();
    const other = await newUser();
    const pub = await createView(owner.token, "Public", "public");
    const priv = await createView(owner.token, "Private", "private");

    expectApiError(await call("PATCH", `/views/${pub.id}`, { token: other.token, body: { name: "x" } }), 403, "FORBIDDEN");
    expectApiError(await call("DELETE", `/views/${pub.id}`, { token: other.token }), 403, "FORBIDDEN");
    expectApiError(await call("PATCH", `/views/${priv.id}`, { token: other.token, body: { name: "x" } }), 404, "NOT_FOUND");
    expectApiError(await call("PATCH", `/views/${pub.id}`, { body: { name: "x" } }), 401, "UNAUTHORIZED");

    const patched = await call("PATCH", `/views/${pub.id}`, { token: owner.token, body: { period: "last30" } });
    expect(patched.body).toMatchObject({ period: "last30", name: "Public", cityIds: ["lisbon", "london"] });
    expectApiError(await call("PATCH", `/views/${pub.id}`, { token: owner.token, body: { cityIds: [] } }), 400, "VALIDATION");

    expect((await call("DELETE", `/views/${pub.id}`, { token: owner.token })).status).toBe(204);
    expectApiError(await call("GET", `/views/${pub.id}`), 404, "NOT_FOUND");
  });

  it("keeps saved cities idempotent and builds the personal dashboard from them", async () => {
    const me = await newUser();
    const first = await call("GET", "/personal-dashboard", { token: me.token });
    expect(first.body.source).toBe("default");
    expect(first.body.config.cityIds).toHaveLength(3);

    await call("PUT", "/saved-cities/tokyo", { token: me.token });
    const twice = await call("PUT", "/saved-cities/tokyo", { token: me.token });
    expect(twice.body).toHaveLength(1);
    expectApiError(await call("PUT", "/saved-cities/atlantis", { token: me.token }), 404, "NOT_FOUND");
    expect((await call("GET", "/personal-dashboard", { token: me.token })).body.config.cityIds[0]).toBe("tokyo");

    const view = await createView(me.token, "Mine", "private");
    const saved = await call("GET", "/personal-dashboard", { token: me.token });
    expect(saved.body.source).toBe("saved");
    expect(saved.body.view.id).toBe(view.id);

    expect((await call("DELETE", "/saved-cities/tokyo", { token: me.token })).body).toEqual([]);
    expect((await call("DELETE", "/saved-cities/tokyo", { token: me.token })).status).toBe(200);
  });
});
