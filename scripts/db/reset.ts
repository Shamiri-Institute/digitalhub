import { pool } from "#/db/client";

async function main() {
  const url = new URL(process.env.DATABASE_URL ?? "");
  if (
    url.hostname !== "localhost" &&
    url.hostname !== "127.0.0.1" &&
    process.env.VERCEL_ENV === "production"
  ) {
    throw new Error("refusing to reset a production database");
  }
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
