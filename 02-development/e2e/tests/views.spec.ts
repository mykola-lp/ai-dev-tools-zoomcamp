import { expect, test } from "@playwright/test";
import { DEMO, register, signIn, uniqueEmail } from "./helpers";

test("saving a view stores it and lists it under Views", async ({ page }) => {
  await register(page, uniqueEmail());
  const name = `E2E view ${Date.now()}`;

  await page.getByRole("button", { name: "Save view" }).click();
  await page.getByLabel("Name").fill(name);
  await page.getByRole("button", { name: "Save", exact: true }).click();

  await expect(page).toHaveURL(/\/v\//);
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();

  await page.goto("/views");
  await expect(page.getByRole("link", { name })).toBeVisible();
});

test("running an analysis stores a snapshot that opens from the history", async ({ page }) => {
  await signIn(page, DEMO.email, DEMO.password);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  await page.getByRole("button", { name: "Run analysis" }).click();
  await page.getByRole("button", { name: "Open" }).click();

  await expect(page).toHaveURL(/\/history\/.+/);
  await expect(page.getByRole("heading", { name: "Aggregates" })).toBeVisible();
  await expect(page.getByText(/@v\d+:/)).toBeVisible();
});

test("public views open by link for anyone, private views stay hidden", async ({ page, request }) => {
  // `request` has its own cookie jar, so `page` stays anonymous.
  const login = await request.post("/api/auth/login", { data: DEMO });
  expect(login.ok()).toBeTruthy();
  const views = (await (await request.get("/api/views")).json()) as {
    id: string;
    name: string;
    visibility: "public" | "private";
  }[];
  const pub = views.find((v) => v.visibility === "public")!;
  const priv = views.find((v) => v.visibility === "private")!;

  await page.goto(`/v/${pub.id}`);
  await expect(page.getByRole("heading", { level: 1, name: pub.name })).toBeVisible();
  await expect(page.getByText("Shared view")).toBeVisible();

  await page.goto(`/v/${priv.id}`);
  await expect(page.getByText(/isn.t available/)).toBeVisible();
});
