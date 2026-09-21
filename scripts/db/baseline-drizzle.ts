// Marks the Drizzle baseline migration as applied on a database that was built by the Prisma
// migrations, so `drizzle-kit migrate` applies only what comes after it. Idempotent: it does
// nothing when the migrations log already has rows, and nothing on an empty database (there
// `drizzle-kit migrate` creates everything from the baseline itself).
//
//   dotenv -c development -- tsx scripts/db/baseline-drizzle.ts
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";

import { Pool } from "pg";

const MIGRATIONS_DIR = path.join(process.cwd(), "drizzle");

async function main() {
  const journal = JSON.parse(
    readFileSync(path.join(MIGRATIONS_DIR, "meta/_journal.json"), "utf8"),
  ) as {
    entries: { idx: number; when: number; tag: string }[];
  };
  const baseline = journal.entries.find((e) => e.idx === 0);
  if (!baseline) throw new Error("drizzle/meta/_journal.json has no entry 0");
  const sql = readFileSync(path.join(MIGRATIONS_DIR, `${baseline.tag}.sql`), "utf8");
  // Same hash drizzle-kit records: sha256 of the migration file content.
  const hash = createHash("sha256").update(sql).digest("hex");

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const hasSchema = await pool.query<{ ok: boolean }>(
      "select to_regclass('public.users') is not null as ok",
    );
    if (!hasSchema.rows[0]?.ok) {
      console.log("baseline: empty database, nothing to mark; drizzle-kit migrate will build it");
      return;
    }
    await pool.query("create schema if not exists drizzle");
    await pool.query(
      `create table if not exists drizzle.__drizzle_migrations (
         id serial primary key,
         hash text not null,
         created_at bigint
       )`,
    );
    const existing = await pool.query<{ n: string }>(
      "select count(*)::text as n from drizzle.__drizzle_migrations",
    );
    if (Number(existing.rows[0]?.n) > 0) {
      console.log("baseline: migrations log already has rows, nothing to do");
      return;
    }
    await pool.query(
      "insert into drizzle.__drizzle_migrations (hash, created_at) values ($1, $2)",
      [hash, baseline.when],
    );
    console.log(`baseline: marked ${baseline.tag} as applied (created_at ${baseline.when})`);
  } finally {
    await pool.end();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
