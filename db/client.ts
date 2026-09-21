import type { SQL } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { PgDialect } from "drizzle-orm/pg-core";
import { DatabaseError, Pool, types } from "pg";

import * as relations from "./relations";
import * as schema from "./schema";

// Raw query results follow Prisma's conventions: int8 as number (the schema has no
// BigInt column), `timestamp` without time zone read as UTC, `date` as UTC midnight.
types.setTypeParser(types.builtins.INT8, Number);
types.setTypeParser(types.builtins.TIMESTAMP, (value) => new Date(`${value.replace(" ", "T")}Z`));
types.setTypeParser(types.builtins.DATE, (value) => new Date(`${value}T00:00:00Z`));

function createPool() {
  const connectionString = process.env.DATABASE_URL ?? "";
  const url = new URL(connectionString);
  const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  return new Pool({
    connectionString,
    // ponytail: fixed pool per instance; tune when RDS connection counts say so.
    max: 5,
    idleTimeoutMillis: 20_000,
    // Prisma defaulted to sslmode=prefer (encrypted, no CA check). pg needs that spelled out
    // for RDS unless the URL sets sslmode itself.
    ssl: local || url.searchParams.has("sslmode") ? undefined : { rejectUnauthorized: false },
  });
}

// One pool per process; in development the module reloads on every edit, so keep it global.
const globalForDb = globalThis as unknown as { pgPool?: Pool };
export const pool = globalForDb.pgPool ?? createPool();
if (process.env.NODE_ENV !== "production") {
  globalForDb.pgPool = pool;
}

export const db = drizzle({
  client: pool,
  schema: { ...schema, ...relations },
  logger: process.env.DEBUG === "1",
});

export type Database = typeof db;
export type TransactionCursor = Parameters<Parameters<Database["transaction"]>[0]>[0];
export type DatabaseCursor = Database | TransactionCursor;

const dialect = new PgDialect();

/** Replacement for `prisma.$queryRaw`: rows come back with the type parsers above applied. */
export async function queryRaw<T extends Record<string, unknown>>(query: SQL): Promise<T[]> {
  const { sql, params } = dialect.sqlToQuery(query);
  const result = await pool.query<T>(sql, params);
  return result.rows;
}

/** Replacement for `prisma.$executeRaw`: returns the affected row count. */
export async function executeRaw(query: SQL): Promise<number> {
  const { sql, params } = dialect.sqlToQuery(query);
  const result = await pool.query(sql, params);
  return result.rowCount ?? 0;
}

/** Drizzle wraps driver errors; find the Postgres error underneath. */
export function pgError(error: unknown): DatabaseError | undefined {
  if (error instanceof DatabaseError) return error;
  if (error instanceof Error && error.cause instanceof DatabaseError) return error.cause;
  return undefined;
}

/** Prisma `P2002`. */
export function isUniqueViolation(error: unknown) {
  return pgError(error)?.code === "23505";
}

/** Prisma `P2034`: serializable transaction conflict, retry the transaction. */
export function isSerializationFailure(error: unknown) {
  return pgError(error)?.code === "40001";
}
