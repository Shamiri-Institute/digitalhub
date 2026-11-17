import { Client } from "pg";

import { pool } from "#/db/client";
import { databaseUrl } from "#/db/url";

// A preview branch owns its whole database, so recreating it also covers the first build.
async function recreatePreviewDatabase(url: URL) {
  const name = url.pathname.slice(1);
  url.pathname = "/postgres";
  const admin = new Client({ connectionString: url.toString() });
  await admin.connect();
  try {
    await admin.query(`drop database if exists "${name}" with (force)`);
    await admin.query(`create database "${name}"`);
  } finally {
    await admin.end();
  }
}

async function main() {
  const url = new URL(databaseUrl());
  console.log(`reset: ${url.hostname}${url.pathname}`);
  if (process.env.PREVIEW_DATABASE_URL) return recreatePreviewDatabase(url);
  if (
    url.hostname !== "localhost" &&
    url.hostname !== "127.0.0.1" &&
    process.env.VERCEL_ENV === "production"
  ) {
    throw new Error("refusing to reset a production database");
  }
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
