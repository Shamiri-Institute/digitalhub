import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "#": path.resolve(__dirname, "./"),
    },
  },
  plugins: [react()],
  test: {
    environment: "jsdom",
    include: ["./**/*.test.tsx"],
  },
});
