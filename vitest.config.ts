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
  },
});
