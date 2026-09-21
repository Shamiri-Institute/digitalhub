// Drops everything in the database so `drizzle-kit migrate` and the seed rebuild it from
// scratch. Used by the seeded preview build and `npm run db:dev:migrate:reset`.
//
//   dotenv -c development -- tsx scripts/db/reset.ts
import { Pool } from "pg";

async function main() {
  const url = new URL(process.env.DATABASE_URL ?? "");
  if (
    url.hostname !== "localhost" &&
    url.hostname !== "127.0.0.1" &&
    process.env.VERCEL_ENV === "production"
  ) {
    throw new Error("refusing to reset a production database");
  }
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  console.log(`reset: dropping schema public on ${url.hostname}${url.pathname}`);
  try {
    await pool.query("drop schema if exists public cascade");
    await pool.query("create schema public");
    await pool.query("drop schema if exists drizzle cascade");
  } finally {
    await pool.end();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
