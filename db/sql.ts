import { type AnyColumn, getTableName, sql } from "drizzle-orm";

/**
 * `(select count(*) from <fk's table> where <fk> = <ref>)` for relational-query `extras`,
 * i.e. the number of related rows.
 *
 * Both sides are spelled as raw SQL on purpose. Drizzle rewrites every Column inside an
 * `extras` SQL to the current relation's alias (so `otherTable.fk` would become
 * `"current_alias"."fk"`), and at the root of a query without `with` it renders the
 * callback column unqualified, where it would bind to the subquery's table. The callback
 * column's table name is the FROM alias in both cases (`"student"` at the root,
 * `"fellow_students"` nested), so qualifying with it is always right.
 */
export function countOf(fk: AnyColumn, ref: AnyColumn) {
  const table = sql.raw(`"${getTableName(fk.table)}"."${fk.name}"`);
  const outer = sql.raw(`"${getTableName(ref.table)}"."${ref.name}"`);
  return sql<number>`(select count(*)::int from ${sql.raw(`"${getTableName(fk.table)}"`)} where ${table} = ${outer})`;
}
