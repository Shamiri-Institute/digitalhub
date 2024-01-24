import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  root: "app",
  resolve: {
    alias: {
      "#": path.resolve(__dirname, "./"),
    },
  },
  plugins: [react()],
  test: {
    environment: "jsdom",
  },
});
