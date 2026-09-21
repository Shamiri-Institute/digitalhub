import { defineConfig } from "drizzle-kit";

import { databaseUrl } from "./db/url";

// Run through `dotenv -c development -- drizzle-kit ...` so DATABASE_URL is loaded.
export default defineConfig({
  dialect: "postgresql",
  schema: "./db/schema.ts",
  out: "./drizzle",
  dbCredentials: { url: databaseUrl() },
  strict: true,
  verbose: true,
});
