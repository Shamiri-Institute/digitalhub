import { defineConfig } from "drizzle-kit";

// Run through `dotenv -c development -- drizzle-kit ...` so DATABASE_URL is loaded.
export default defineConfig({
  dialect: "postgresql",
  schema: "./db/schema.ts",
  out: "./drizzle",
  dbCredentials: { url: process.env.DATABASE_URL ?? "" },
  strict: true,
  verbose: true,
});
