import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // Honors the `paths` entry in tsconfig.json (so "@/lib/foo" resolves to
    // src/lib/foo). Vitest v4+ supports this natively — no plugin needed.
    tsconfigPaths: true,
  },
  test: {
    environment: "node",
    include: ["src/**/__tests__/**/*.test.{ts,tsx}"],
    exclude: ["node_modules", ".next", "dist", "build"],
  },
});
