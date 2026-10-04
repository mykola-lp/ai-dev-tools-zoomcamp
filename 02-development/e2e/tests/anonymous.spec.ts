import { expect, test } from "@playwright/test";

test("anonymous visitors see real weather data and insights", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Temporary view", { exact: true })).toBeVisible();  
  await expect(page.getByRole("heading", { name: "Lisbon, Portugal" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Next 5 days" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Insights" })).toBeVisible();
});

test("anonymous visitors can add a city found through search", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Lisbon, Portugal" })).toBeVisible();
  await page.getByRole("button", { name: "Add city" }).click();
  await page.getByLabel("Search city").fill("Tokyo");
  await page.getByRole("button", { name: /Tokyo/ }).click();
  await page.keyboard.press("Escape");
  await expect(page.getByLabel("Remove Tokyo")).toBeVisible();
});

test("saving requires an account: anonymous users are sent to sign in", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Lisbon, Portugal" })).toBeVisible();
  await page.getByRole("button", { name: "Save view" }).click();
  await expect(page).toHaveURL(/\/login/);
});
