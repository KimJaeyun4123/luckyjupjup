import { fileURLToPath } from "node:url";
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    // 브라우저 E2E(e2e/*.spec.ts)는 Playwright가 돌린다
    exclude: [...configDefaults.exclude, "e2e/**"],
  },
});
