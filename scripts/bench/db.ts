import { pool } from "#/db/client";

export async function query<T>(text: string, params: unknown[] = []): Promise<T[]> {
  const result = await pool.query(text, params);
  return result.rows as T[];
}

export function close() {
  return pool.end();
}
