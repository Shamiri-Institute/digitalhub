// Rewrites every primary key that is not a prefixed TypeID, so that all ids carry a uuidv7.
//
//   npx dotenv -c development -- tsx scripts/db/backfill-typeid.ts            # report only
//   npx dotenv -c development -- tsx scripts/db/backfill-typeid.ts --apply
//
// Rows created under Prisma hold a cuid, and rows created between the Drizzle cutover and
// ENG-2164 hold a uuid version 4. Neither is time-ordered, which is what ENG-2164 fixes for new
// rows. This brings the existing rows to the same shape.
//
// Every foreign key in this database is ON UPDATE CASCADE, so updating a parent id rewrites each
// child reference in the same statement. The script therefore only updates the owning table.
//
// The new id is built from the row's `created_at`, not from the clock, so the timestamp inside
// the uuid stays true and the ids keep sorting in creation order.
import { parseArgs } from "node:util";

import { is } from "drizzle-orm";
import { PgTable, getTableConfig } from "drizzle-orm/pg-core";
import { TypeID } from "typeid-js";

import { pool } from "#/db/client";
import * as schema from "#/db/schema";

/** A prefixed TypeID: a lowercase prefix and 26 characters of Crockford base32. */
const TYPEID = "^[a-z]+_[0-9a-hjkmnp-tv-z]{26}$";

/** Bookkeeping tables that carry an id but hold no application data. */
const NOT_APPLICATION_DATA = new Set(["_prisma_migrations", "__drizzle_migrations"]);

/**
 * Tables whose id is always supplied by a call site, and whose rows are all still pre-TypeID, so
 * neither the schema default nor an existing row can name the prefix. The value is the prefix
 * that call site passes to `objectId`.
 */
const PREFIX_BY_CALL_SITE: Record<string, string> = {
  student_outcomes: "outcome",
};

const { values: args } = parseArgs({
  options: {
    apply: { type: "boolean", default: false },
    batch: { type: "string", default: "500" },
    table: { type: "string" },
  },
});
const batchSize = Number(args.batch);

/** A uuid version 7 whose timestamp is `ms`, so a backfilled id sorts where the row belongs. */
function uuidV7At(ms: number) {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  // The first 48 bits are the millisecond timestamp, big-endian. Plain division keeps this
  // inside a safe integer, so it needs no BigInt.
  let rest = Math.max(0, Math.trunc(ms));
  for (let i = 5; i >= 0; i--) {
    bytes[i] = rest % 256;
    rest = Math.floor(rest / 256);
  }
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x70;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/**
 * The prefix each table should use. The schema is the authority, because its default is what new
 * rows already get; for a table whose id is always supplied by a call site there is no default,
 * so the prefix comes from the rows that are already TypeIDs.
 */
function prefixesFromSchema() {
  const byTable = new Map<string, string>();
  for (const value of Object.values(schema)) {
    if (!is(value, PgTable)) continue;
    const { name, columns } = getTableConfig(value as PgTable);
    const id = columns.find((column) => column.name === "id");
    if (typeof id?.defaultFn !== "function") continue;
    const sample = String(id.defaultFn());
    const prefix = sample.split("_")[0];
    if (prefix && new RegExp(TYPEID).test(sample)) byTable.set(name, prefix);
  }
  return byTable;
}

async function tablesWithTextIds() {
  const { rows } = await pool.query<{ table_name: string; has_created_at: boolean }>(
    `select c.table_name,
            bool_or(x.column_name = 'created_at') as has_created_at
     from information_schema.columns c
     join information_schema.columns x
       on x.table_schema = c.table_schema and x.table_name = c.table_name
     where c.table_schema = 'public'
       and c.column_name = 'id'
       and c.data_type in ('text', 'character varying')
     group by c.table_name
     order by c.table_name`,
  );
  return rows;
}

async function prefixFromRows(table: string) {
  const { rows } = await pool.query<{ prefix: string }>(
    `select split_part(id, '_', 1) as prefix, count(*) as n
     from public."${table}" where id ~ $1
     group by 1 order by n desc limit 1`,
    [TYPEID],
  );
  return rows[0]?.prefix ?? null;
}

/**
 * The assumptions this rewrite depends on. They hold on the development database; an environment
 * that answers differently needs a closer look before `--apply` runs there.
 */
async function preflight(touched: string[]) {
  const problems: string[] = [];

  const { rows: fks } = await pool.query<{ rule: string; n: number }>(
    `select confupdtype as rule, count(*)::int as n from pg_constraint where contype = 'f' group by 1`,
  );
  const total = fks.reduce((sum, r) => sum + r.n, 0);
  const cascading = fks.find((r) => r.rule === "c")?.n ?? 0;
  console.log(`foreign keys:       ${cascading}/${total} are ON UPDATE CASCADE`);
  if (cascading !== total) {
    const { rows: bad } = await pool.query<{ name: string; child: string; parent: string }>(
      `select c.conname as name, c.conrelid::regclass::text as child, c.confrelid::regclass::text as parent
       from pg_constraint c where c.contype = 'f' and c.confupdtype <> 'c'
       order by 2 limit 20`,
    );
    const list = bad.map((b) => `${b.child} -> ${b.parent} (${b.name})`).join("\n    ");
    problems.push(
      `${total - cascading} foreign keys do not cascade on update, so a parent id cannot be rewritten safely:\n    ${list}`,
    );
  }

  const { rows: triggers } = await pool.query<{ table: string; name: string }>(
    `select c.relname as table, t.tgname as name
     from pg_trigger t join pg_class c on c.oid = t.tgrelid
     join pg_namespace n on n.oid = c.relnamespace
     where not t.tgisinternal and n.nspname = 'public' and c.relname = any($1)`,
    [touched],
  );
  console.log(`triggers:           ${triggers.length} on the tables to rewrite`);
  if (triggers.length > 0) {
    const list = triggers.map((t) => `${t.table}.${t.name}`).join("\n    ");
    problems.push(`these triggers fire on the rewrite:\n    ${list}`);
  }

  const { rows: publications } = await pool.query<{ pubname: string; n: number }>(
    `select p.pubname, count(*)::int as n from pg_publication p
     left join pg_publication_tables t on t.pubname = p.pubname
     group by 1`,
  );
  console.log(`replication:        ${publications.length} publications`);
  if (publications.length > 0) {
    const list = publications.map((p) => `${p.pubname} (${p.n} tables)`).join("\n    ");
    problems.push(
      `logical replication is on, so every rewritten row ships downstream:\n    ${list}`,
    );
  }

  return problems;
}

async function main() {
  const url = new URL(process.env.DATABASE_URL ?? "");
  console.log(`target: ${url.hostname}:${url.port || "5432"}${url.pathname}`);
  console.log(args.apply ? "mode:   APPLY (rows will be rewritten)\n" : "mode:   report only\n");

  const schemaPrefixes = prefixesFromSchema();
  const tables = (await tablesWithTextIds()).filter(
    (t) => !NOT_APPLICATION_DATA.has(t.table_name) && (!args.table || t.table_name === args.table),
  );

  let totalPending = 0;
  let totalRewritten = 0;
  const skipped: string[] = [];
  const touched: string[] = [];

  for (const { table_name: table, has_created_at: hasCreatedAt } of tables) {
    const { rows: countRows } = await pool.query<{ n: string }>(
      `select count(*)::int as n from public."${table}" where id !~ $1`,
      [TYPEID],
    );
    const pending = Number(countRows[0]?.n ?? 0);
    if (pending === 0) continue;

    const prefix =
      schemaPrefixes.get(table) ??
      (await prefixFromRows(table)) ??
      PREFIX_BY_CALL_SITE[table] ??
      null;
    if (!prefix) {
      skipped.push(`${table} (${pending} rows, no prefix: no schema default and no TypeID row)`);
      continue;
    }

    totalPending += pending;
    touched.push(table);
    console.log(`${table.padEnd(46)} ${String(pending).padStart(7)} rows -> ${prefix}_`);
    if (!args.apply) continue;

    let rewritten = 0;
    for (;;) {
      const { rows } = await pool.query<{ id: string; created_at: Date | null }>(
        `select id, ${hasCreatedAt ? "created_at" : "null::timestamptz as created_at"}
         from public."${table}" where id !~ $1 limit $2`,
        [TYPEID, batchSize],
      );
      if (rows.length === 0) break;

      // One statement per batch, not per row. Each id still cascades to its children, but at
      // this volume the round trips dominate: production has about 223k ids to rewrite and
      // roughly 660k child rows that follow them.
      const pairs = rows.map((row) => {
        const ms = row.created_at ? row.created_at.getTime() : Date.now();
        return [row.id, TypeID.fromUUID(prefix, uuidV7At(ms)).toString()];
      });
      const values = pairs.map((_, i) => `($${i * 2 + 1}, $${i * 2 + 2})`).join(", ");

      const client = await pool.connect();
      try {
        await client.query("begin");
        await client.query(
          `update public."${table}" as t set id = v.next
           from (values ${values}) as v(current, next)
           where t.id = v.current`,
          pairs.flat(),
        );
        await client.query("commit");
      } catch (error) {
        await client.query("rollback");
        throw error;
      } finally {
        client.release();
      }
      rewritten += rows.length;
      process.stdout.write(`  ${rewritten}/${pending}\r`);
    }
    totalRewritten += rewritten;
    console.log(`  ${rewritten}/${pending} done`);
  }

  const problems = await preflight(touched);
  console.log("");

  if (totalPending === 0) console.log("Every id is already a prefixed TypeID.");
  else if (args.apply) console.log(`\nRewrote ${totalRewritten} ids.`);
  else console.log(`\n${totalPending} ids would be rewritten. Re-run with --apply.`);

  if (skipped.length > 0) {
    console.log(`\nSkipped, decide a prefix first:\n  ${skipped.join("\n  ")}`);
    process.exitCode = 1;
  }

  if (problems.length > 0) {
    console.log(`\nCheck these before --apply on this database:\n  ${problems.join("\n  ")}`);
    process.exitCode = 1;
  }
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    void pool.end();
  });
