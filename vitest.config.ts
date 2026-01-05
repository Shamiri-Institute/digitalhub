import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "#": path.resolve(__dirname, "./"),
    },
  },
  // @ts-expect-error react plugin type compatibility with vitest
  plugins: [react()],
  test: {
    environment: "jsdom",
    include: ["./**/*.test.tsx"],
  },
});
