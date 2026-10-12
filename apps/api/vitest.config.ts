import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globalSetup: ["tests/globalSetup.ts"],
    setupFiles: ["tests/setup.ts"],
    environment: "node",
    include: ["tests/**/*.test.ts"],
    testTimeout: 30000,
    hookTimeout: 60000,
    fileParallelism: false,
    pool: "forks",
  },
});