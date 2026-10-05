import { describe, expect, it } from "vitest";
import { call, configBody, createView, expectApiError, newUser } from "./support";

describe("analysis history", () => {
  it("stores runs per user, newest first, and hides them from other users", async () => {
    const me = await newUser();
    const other = await newUser();
    const first = await call("POST", "/history/runs", { token: me.token, body: configBody(["lisbon"]) });
    const second = await call("POST", "/history/runs", { token: me.token, body: configBody(["london"]) });
    expect(first.status).toBe(201);
    expect(second.body.id).not.toBe(first.body.id);
    expect(first.body.dataVersion).toMatch(/^historical@v\d+:/);
    expect(first.body.cities[0].name).toBe("Lisbon");

    const list = await call("GET", "/history/runs", { token: me.token });
    expect(list.body.map((r: { id: string }) => r.id)).toEqual([second.body.id, first.body.id]);

    expectApiError(await call("GET", `/history/runs/${first.body.id}`, { token: other.token }), 404, "NOT_FOUND");
    expect((await call("GET", "/history/runs", { token: other.token })).body).toEqual([]);
    expectApiError(await call("POST", "/history/runs", { token: me.token, body: configBody(["atlantis"]) }), 404, "NOT_FOUND");
  });

  it("never changes a stored run when its view is edited or deleted", async () => {
    const me = await newUser();
    const view = await createView(me.token, "Original", "private", ["lisbon", "london"]);
    const run = await call("POST", "/history/runs", { token: me.token, body: configBody(["lisbon", "london"]) });
    expect(run.status).toBe(201);
    const snapshot = (await call("GET", `/history/runs/${run.body.id}`, { token: me.token })).body;

    await call("PATCH", `/views/${view.id}`, { token: me.token, body: { name: "Changed", cityIds: ["kyiv"], period: "last30" } });
    const second = await call("POST", "/history/runs", { token: me.token, body: configBody(["kyiv"], "last30") });
    await call("DELETE", `/views/${view.id}`, { token: me.token });

    const after = await call("GET", `/history/runs/${run.body.id}`, { token: me.token });
    expect(after.body).toEqual(snapshot);
    expect(after.body.cities.map((c: { id: string }) => c.id)).toEqual(["lisbon", "london"]);
    expect(second.body.cities.map((c: { id: string }) => c.id)).toEqual(["kyiv"]);
    expect((await call("GET", "/history/runs", { token: me.token })).body).toHaveLength(2);
  });
});
