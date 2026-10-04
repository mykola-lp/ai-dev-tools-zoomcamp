import { expect, type Page } from "@playwright/test";

export const DEMO = { email: "demo@example.com", password: "demo1234" };

export const uniqueEmail = () => `e2e-${Date.now()}-${Math.floor(Math.random() * 10_000)}@example.com`;

// The app is server-rendered: wait until React has hydrated, otherwise a fast fill()+click()
// can submit the form natively before the JS handlers exist.
async function openLogin(page: Page) {
  await page.goto("/login");
  await page.waitForLoadState("networkidle");
}

export async function signIn(page: Page, email: string, password: string) {
  await openLogin(page);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("button", { name: "Account", exact: true })).toBeVisible();
}

export async function register(page: Page, email: string, password = "secret123") {
  await openLogin(page);
  await page.getByRole("button", { name: /Create one/ }).click();
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);

  const [response] = await Promise.all([
    page.waitForResponse((r) => r.url().includes("/api/auth/register")),
    page.getByRole("button", { name: "Create account" }).click(),
  ]);

  expect(response.status(), await response.text()).toBe(201);
  await expect(page.getByRole("button", { name: "Account", exact: true })).toBeVisible();
}
