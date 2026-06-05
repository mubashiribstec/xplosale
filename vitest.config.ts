import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    setupFiles: ["./src/__tests__/setup.ts"],
    // next-auth's compiled output imports "next/server" without an extension,
    // which Node's ESM resolver can't find inside the pnpm layout. Inlining lets
    // Vite's resolver (which handles extensionless specifiers) process it.
    server: { deps: { inline: ["next-auth", "@auth/core"] } },
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      exclude: ["node_modules", ".next", "prisma", "src/__tests__"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
