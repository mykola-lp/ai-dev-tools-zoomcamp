import { expect, test } from "@playwright/test";
import { DEMO, register, signIn, uniqueEmail } from "./helpers";

test("a new user registers, gets the default view and can sign out", async ({ page }) => {
  await register(page, uniqueEmail());
  await expect(page.getByText("Your default view")).toBeVisible();

  await page.getByRole("button", { name: "Account" }).click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await expect(page.getByRole("link", { name: "Sign in" })).toBeVisible();
});

test("the demo user sees seeded views, saved cities and a personal dashboard", async ({ page }) => {
  await signIn(page, DEMO.email, DEMO.password);
  // the most recently updated seeded view opens as the personal dashboard
  await expect(page.getByRole("heading", { level: 1, name: "Forecast: next two weeks" })).toBeVisible();

  await page.goto("/views");
  await expect(page.getByRole("link", { name: "Europe this week" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Wet or dry? 30 days" })).toBeVisible();
  for (const city of ["Lisbon", "London", "Kyiv"]) {
    await expect(page.getByText(city, { exact: true })).toBeVisible();
  }
});
