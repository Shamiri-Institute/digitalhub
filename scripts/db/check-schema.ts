// 1. Every foreign key needs an index on its referencing columns; a partial index does not count
// 2. A migration that drops a column or table sets lock_timeout, so a busy table fails the
//    deploy instead of queueing all traffic behind the lock.
// 3. Each migration's journal time is later than the one before: the migrator skips, without an
//    error, a migration older than the last one a database ran.
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { pool } from "#/db/client";

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
          and i.indpred is null
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

function migrationsOutOfOrder() {
  const journal = JSON.parse(
    readFileSync(path.join(migrationsDir, "meta/_journal.json"), "utf8"),
  ) as {
    entries: { tag: string; when: number }[];
  };
  return journal.entries.filter(
    (entry, index) => index > 0 && entry.when <= (journal.entries[index - 1]?.when ?? 0),
  );
}

async function main() {
  let unindexed: string[];
  try {
    unindexed = await unindexedForeignKeys();
  } finally {
    await pool.end();
  }
  const missingLockTimeout = dropMigrationsWithoutLockTimeout();
  const outOfOrder = migrationsOutOfOrder();

  const problems = [
    ...unindexed.map((name) => `foreign key without an index: ${name}`),
    ...missingLockTimeout.map(
      (file) => `drop migration without SET LOCAL lock_timeout = '5s': drizzle/${file}`,
    ),
    ...outOfOrder.map(
      (entry) =>
        `migration not later than the one before it in drizzle/meta/_journal.json: ${entry.tag}`,
    ),
  ];
  if (problems.length > 0) {
    console.error(problems.join("\n"));
    process.exitCode = 1;
  } else {
    console.log("check-schema: ok");
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
