import { defineConfig, devices } from "@playwright/test";

const BACKEND_PORT = 18080;
const FRONTEND_PORT = 15173;
const E2E_DB = "/tmp/weather-e2e.db";

export default defineConfig({
  testDir: "./tests",
  timeout: 30_000,
  expect: { timeout: 10_000 },
  // One shared SQLite database: run serially.
  workers: 1,
  fullyParallel: false,
  retries: process.env["CI"] ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: `http://localhost:${FRONTEND_PORT}`,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      // Fresh database on every run; demo data is seeded on startup.
      command: `rm -f ${E2E_DB}* && ./mvnw spring-boot:run`,
      cwd: "../backend",
      stdout: "pipe",
      stderr: "pipe",
      url: `http://localhost:${BACKEND_PORT}/api/weather/freshness`,
      timeout: 180_000,
      reuseExistingServer: false,
      env: {
        PORT: String(BACKEND_PORT),
        SPRING_PROFILES_ACTIVE: "dev",
        DB_PATH: E2E_DB,
        SEED_ENABLED: "true",
        APP_WEATHER_SCHEDULER_ENABLED: "false",
      },
    },
    {
      command: `npx vite dev --port ${FRONTEND_PORT} --strictPort`,
      cwd: "../frontend",
      url: `http://localhost:${FRONTEND_PORT}`,
      timeout: 120_000,
      reuseExistingServer: false,
      env: {
        API_TARGET: `http://localhost:${BACKEND_PORT}`,
        VITE_USE_MOCK: "false",
      },
    },
  ],
});