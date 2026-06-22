import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname),
    },
  },
  test: {
    globals: true,
    environment: "node",
    include: ["__tests__/**/*.test.ts"],
    exclude: ["__tests__/perf-verification.test.ts"],
    setupFiles: ["__tests__/setup.ts"],
    coverage: {
      provider: "v8",
      include: [
        "app/api/**/*.ts",
        "lib/**/*.ts",
        "data/**/*.ts",
      ],
    },
    // Give file-system and Supabase-mock tests time on Windows
    testTimeout: 10_000,
    hookTimeout: 10_000,
  },
});
