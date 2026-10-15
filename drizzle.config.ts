import { defineConfig } from "drizzle-kit";

import { databaseUrl } from "./db/url";

export default defineConfig({
  dialect: "postgresql",
  schema: "./db/schema.ts",
  out: "./drizzle",
  dbCredentials: { url: databaseUrl() },
  strict: true,
  verbose: true,
});
