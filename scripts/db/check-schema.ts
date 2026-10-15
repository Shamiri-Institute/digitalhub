// 1. Every foreign key needs an index on its referencing columns: ON UPDATE/DELETE on the
//    parent scans the child table otherwise (ENG-2164). scripts/db/unindexed-fks.txt lists the
//    keys that predate the rule; it may only shrink.
// 2. A migration that drops a column or table sets lock_timeout, so a busy table fails the
//    deploy instead of queueing all traffic behind the lock.
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { pool } from "#/db/client";

const allowlistPath = path.join(__dirname, "unindexed-fks.txt");
const migrationsDir = path.join(__dirname, "../../drizzle");
const firstMigrationNeedingLockTimeout = 18;

async function unindexedForeignKeys() {
  const { rows } = await pool.query<{ name: string }>(`
    select c.conrelid::regclass || '.' || c.conname as name
    from pg_constraint c
    where c.contype = 'f'
      and c.connamespace = 'public'::regnamespace
      and not exists (
        select 1 from pg_index i
        where i.indrelid = c.conrelid
          and (i.indkey::int2[])[0:cardinality(c.conkey) - 1] @> c.conkey
          and (i.indkey::int2[])[0:cardinality(c.conkey) - 1] <@ c.conkey
      )
    order by 1`);
  return rows.map((r) => r.name);
}

function dropMigrationsWithoutLockTimeout() {
  return readdirSync(migrationsDir)
    .filter(
      (file) =>
        file.endsWith(".sql") && Number(file.slice(0, 4)) >= firstMigrationNeedingLockTimeout,
    )
    .filter((file) => {
      const migration = readFileSync(path.join(migrationsDir, file), "utf8");
      return /\bDROP\s+(COLUMN|TABLE)\b/i.test(migration) && !/\block_timeout\b/i.test(migration);
    });
}

async function main() {
  const allowed = new Set(
    readFileSync(allowlistPath, "utf8")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean),
  );
  let unindexed: string[];
  try {
    unindexed = await unindexedForeignKeys();
  } finally {
    await pool.end();
  }
  const newUnindexed = unindexed.filter((name) => !allowed.has(name));
  const nowIndexed = [...allowed].filter((name) => !unindexed.includes(name));
  const missingLockTimeout = dropMigrationsWithoutLockTimeout();

  const problems = [
    ...newUnindexed.map((name) => `foreign key without an index: ${name}`),
    ...nowIndexed.map((name) => `remove from unindexed-fks.txt, it is indexed or gone: ${name}`),
    ...missingLockTimeout.map(
      (file) => `drop migration without SET LOCAL lock_timeout = '5s': drizzle/${file}`,
    ),
  ];
  if (problems.length > 0) {
    console.error(problems.join("\n"));
    process.exitCode = 1;
  } else {
    console.log(`check-schema: ok (${unindexed.length} allowlisted unindexed foreign keys)`);
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
