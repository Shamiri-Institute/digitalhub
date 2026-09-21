import { and, asc, desc, eq, inArray, isNotNull, max, type SQL, sql } from "drizzle-orm";

import { db } from "#/db/client";
import { fellow, hub, payoutStatements, supervisor } from "#/db/schema";

export type PayoutHistoryEntry = Awaited<ReturnType<typeof loadPayoutHistory>>[number];
export type FellowPayoutDetail = PayoutHistoryEntry["fellowDetails"][number];

/**
 * Shared core for the fellow payout-history report. `fellowScope` restricts the fellows the
 * caller may see, written against the `fellow` table, e.g. `eq(fellow.hubId, hubId)`.
 */
export async function loadPayoutHistory(fellowScope: SQL) {
  const nextPayoutDate = sql`lead(${payoutStatements.executedAt}) over (order by ${payoutStatements.executedAt})`;
  const payoutDates = await db
    .select({
      // Filtered to non-null below; `mapWith` keeps the column's timestamp decoding.
      dateAdded: sql<Date>`${payoutStatements.executedAt}`.mapWith(payoutStatements.executedAt),
      duration: sql<string>`concat(to_char(${payoutStatements.executedAt}, 'DD/MM/YYYY'), ' - ', coalesce(to_char(${nextPayoutDate}, 'DD/MM/YYYY'), 'N/A'))`,
      totalPayoutAmount: sql<number>`sum(${payoutStatements.amount})`.mapWith(Number),
    })
    .from(payoutStatements)
    .where(
      and(
        inArray(
          payoutStatements.fellowId,
          db.select({ id: fellow.id }).from(fellow).where(fellowScope),
        ),
        isNotNull(payoutStatements.executedAt),
      ),
    )
    .groupBy(payoutStatements.executedAt)
    .orderBy(desc(payoutStatements.executedAt));

  // One query for every payout date; rows are split per date in JS below.
  const details = await db
    .select({
      executedAt: payoutStatements.executedAt,
      fellowId: fellow.id,
      fellowName: fellow.fellowName,
      fellowMpesaName: fellow.mpesaName,
      hub: hub.hubName,
      supervisorName: supervisor.supervisorName,
      // One row per fellow: mpesa_number is nullable and can differ between two
      // statements in the same payout, which would split the fellow.
      mpesaNumber: max(payoutStatements.mpesaNumber),
      totalAmount: sql<number>`sum(${payoutStatements.amount})`.mapWith(Number),
    })
    .from(payoutStatements)
    .innerJoin(fellow, eq(fellow.id, payoutStatements.fellowId))
    .innerJoin(hub, eq(hub.id, fellow.hubId))
    .innerJoin(supervisor, eq(supervisor.id, fellow.supervisorId))
    .where(and(isNotNull(payoutStatements.executedAt), fellowScope))
    .groupBy(
      payoutStatements.executedAt,
      fellow.id,
      fellow.fellowName,
      fellow.mpesaName,
      hub.hubName,
      supervisor.supervisorName,
    )
    .orderBy(asc(fellow.fellowName));

  const detailsByDate = new Map<number, Omit<(typeof details)[number], "executedAt">[]>();
  for (const { executedAt, ...detail } of details) {
    if (!executedAt) continue;
    const key = executedAt.getTime();
    const list = detailsByDate.get(key);
    if (list) list.push(detail);
    else detailsByDate.set(key, [detail]);
  }

  return payoutDates.map((payout) => ({
    ...payout,
    fellowDetails: detailsByDate.get(payout.dateAdded.getTime()) ?? [],
  }));
}
