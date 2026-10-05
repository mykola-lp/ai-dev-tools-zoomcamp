import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globalSetup: ["./global-setup.ts"],
    include: ["tests/**/*.test.ts"],
    testTimeout: 30_000,
    hookTimeout: 240_000,
    // One shared backend and SQLite file: keep files sequential.
    fileParallelism: false,
  },
});