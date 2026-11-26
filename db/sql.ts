import { type AnyColumn, getTableName, type SQL, sql } from "drizzle-orm";

export function nextStudentVisibleId(prefix: string) {
  return sql<string>`${prefix} || '_' || nextval('student_visible_number_seq')`;
}

/**
 * The number of related rows, for relational-query `extras`. Raw SQL because drizzle rewrites
 * columns inside `extras` (see tests/unit/db-sql.test.ts). `filter` is raw SQL over the fk's table.
 */
export function countOf(fk: AnyColumn, ref: AnyColumn, filter?: SQL) {
  const table = qualified(fk);
  const outer = qualified(ref);
  const where = filter ? sql`${table} = ${outer} and ${filter}` : sql`${table} = ${outer}`;
  return sql<number>`(select count(*)::int from ${sql.raw(`"${getTableName(fk.table)}"`)} where ${where})`;
}

/** A column with its table's name or alias, which drizzle leaves out when a query has no `with`. */
export function qualified(column: AnyColumn) {
  return sql.raw(`"${getTableName(column.table)}"."${column.name}"`);
}
