import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * Vitest needs the same `@/*` → `src/*` alias tsconfig.json declares, otherwise
 * any unit under test that imports through the alias fails to resolve — which
 * is why some libs here reach for relative paths instead.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    include: ["src/**/*.test.ts"],
  },
});
