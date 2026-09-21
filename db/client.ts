import { drizzle } from "drizzle-orm/node-postgres";
import { DatabaseError, Pool } from "pg";

import * as relations from "./relations";
import * as schema from "./schema";
import { databaseUrl } from "./url";

function createPool() {
  return new Pool({
    connectionString: databaseUrl(),
    // ponytail: fixed pool per instance; tune when RDS connection counts say so.
    max: 5,
    idleTimeoutMillis: 20_000,
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

/** The `tx` handed to a `db.transaction` callback; helpers that must run inside one take it. */
export type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Drizzle wraps driver errors; find the Postgres error underneath. */
function pgError(error: unknown): DatabaseError | undefined {
  if (error instanceof DatabaseError) return error;
  if (error instanceof Error && error.cause instanceof DatabaseError) return error.cause;
  return undefined;
}

/** Postgres `unique_violation`: an insert or update hit a unique index. */
export function isUniqueViolation(error: unknown) {
  return pgError(error)?.code === "23505";
}

/** Postgres `serialization_failure`: a serializable transaction conflicted; retry it. */
export function isSerializationFailure(error: unknown) {
  return pgError(error)?.code === "40001";
}
