// The only ORM-specific file in the harness. The `query(text, params)` shape is
// node-postgres' `pool.query`, so the Drizzle cut-over only changes this body.
import { db } from "#/lib/db";

export function query<T>(text: string, params: unknown[] = []): Promise<T[]> {
  return db.$queryRawUnsafe<T[]>(text, ...params);
}

export function close() {
  return db.$disconnect();
}
