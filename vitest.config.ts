import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "#": path.resolve(__dirname, "./"),
      // Tests run on the server, so they get the build Next serves to server code: a no-op.
      "server-only": path.resolve(
        __dirname,
        "node_modules/next/dist/compiled/server-only/empty.js",
      ),
    },
  },
  plugins: [react()],
  test: {
    environment: "jsdom",
    include: ["./**/*.test.{ts,tsx}"],
    // Files reuse one worker and its loaded modules instead of reloading the app per file.
    // tests/unit/setup.ts resets process state after each file; AGENTS.md has the rules.
    isolate: false,
    setupFiles: ["./tests/unit/setup.ts"],
    // Random file and test order surfaces state one test leaves for another. A failing order
    // reruns with the seed Vitest prints: `bunx vitest run --sequence.seed=<seed>`.
    sequence: { shuffle: true },
  },
});
