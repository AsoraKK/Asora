import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["feed/tests/**/*.test.ts"],
    environment: "node",
    coverage: {
      reporter: ["text", "lcov"],
      provider: "v8",
      reportsDirectory: "coverage/feed",
    },
  },
});
