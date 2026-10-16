import * as Sentry from "@sentry/nextjs";
import { drizzle } from "drizzle-orm/node-postgres";
import { DatabaseError, Pool } from "pg";

import * as relations from "./relations";
import * as schema from "./schema";
import { databaseUrl } from "./url";

function createPool() {
  const pool = new Pool({
    connectionString: databaseUrl(),
    // ponytail: fixed pool per instance; tune when RDS connection counts say so.
    max: 5,
    idleTimeoutMillis: 20_000,
    connectionTimeoutMillis: 5_000,
  });
  // An idle client that loses its connection emits "error" on the pool; unhandled, it crashes the process.
  pool.on("error", (error) => {
    console.error("Idle Postgres client error", error);
    Sentry.captureException(error);
  });
  return pool;
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

export type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Drizzle wraps driver errors; find the Postgres error underneath. */
function pgError(error: unknown): DatabaseError | undefined {
  if (error instanceof DatabaseError) return error;
  if (error instanceof Error && error.cause instanceof DatabaseError) return error.cause;
  return undefined;
}

export function isUniqueViolation(error: unknown, constraint?: string) {
  const pg = pgError(error);
  return pg?.code === "23505" && (constraint === undefined || pg.constraint === constraint);
}

/** `foreign_key_violation`, or `restrict_violation` from an `ON DELETE RESTRICT` key. */
export function isForeignKeyViolation(error: unknown) {
  const code = pgError(error)?.code;
  return code === "23503" || code === "23001";
}

/** Postgres `serialization_failure`: a serializable transaction conflicted; retry it. */
export function isSerializationFailure(error: unknown) {
  return pgError(error)?.code === "40001";
}
