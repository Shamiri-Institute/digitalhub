import { eq, sql } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import { PgTimestamp } from "drizzle-orm/pg-core";

export function matchesIfSet(column: AnyPgColumn, selectedId: string | null) {
  return selectedId ? eq(column, selectedId) : undefined;
}

/**
 * The local timestamp of a column in the viewer's zone. Columns without a zone store UTC. The zone
 * comes from `viewerTimeZone()`, which only returns names `Intl` accepts, and is inlined so a
 * `select` and its `group by` compile to the same expression.
 */
function inViewerZone(column: AnyPgColumn, timeZone: string) {
  const zone = sql.raw(`'${timeZone}'`);
  return column instanceof PgTimestamp && !column.withTimezone
    ? sql`(${column} at time zone 'UTC' at time zone ${zone})`
    : sql`(${column} at time zone ${zone})`;
}

/**
 * updated_at stores UTC, but the Metabase cards read it as Nairobi wall time, 3 hours early, because
 * that was their session zone. The timely-marking and scheduling figures keep that reading so they
 * match what users saw until the metrics are rebuilt.
 */
export function updatedAtAsMetabaseRead(column: AnyPgColumn) {
  return sql`(${column} at time zone 'Africa/Nairobi')`;
}

export function dayInViewerZone(column: AnyPgColumn, timeZone: string) {
  return sql<string>`to_char(${inViewerZone(column, timeZone)}, 'YYYY-MM-DD')`;
}

export function minuteInViewerZone(column: AnyPgColumn, timeZone: string) {
  return sql<string>`to_char(${inViewerZone(column, timeZone)}, 'YYYY-MM-DD HH24:MI')`;
}

export function startOfTodayInViewerZone(timeZone: string) {
  return sql`(date_trunc('day', now() at time zone ${sql.raw(`'${timeZone}'`)}) at time zone ${sql.raw(`'${timeZone}'`)})`;
}
