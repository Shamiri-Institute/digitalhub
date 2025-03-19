"use server";

import { currentHubCoordinator } from "#/app/auth";
import { db } from "#/lib/db";

export type HubPayoutHistoryType = Awaited<
  ReturnType<typeof loadHubPayoutHistory>
>[number];

export async function loadHubPayoutHistory() {
  const hubCoordinator = await currentHubCoordinator();

  if (!hubCoordinator) {
    throw new Error("Unauthorised user");
  }

  const hubPayoutHistory = await db.$queryRaw<
    Array<{
      dateAdded: Date;
      duration: string;
      totalPayoutAmount: number;
      downloadLink: string;
    }>
  >`
    WITH grouped_payouts AS (
      SELECT 
        DATE_TRUNC('day', executed_at) as payout_date,
        SUM(amount) as total_amount,
        LEAD(DATE_TRUNC('day', executed_at)) OVER (ORDER BY DATE_TRUNC('day', executed_at)) as next_payout_date
      FROM payout_statements ps
      WHERE fellow_id IN (
        SELECT id FROM fellows WHERE hub_id = ${hubCoordinator.assignedHubId}
      )
      AND executed_at IS NOT NULL
      GROUP BY DATE_TRUNC('day', executed_at)
      ORDER BY DATE_TRUNC('day', executed_at) DESC
    )
    SELECT 
      payout_date as "dateAdded",
      CONCAT(
        TO_CHAR(payout_date, 'DD/MM/YYYY'),
        ' - ',
        COALESCE(TO_CHAR(next_payout_date, 'DD/MM/YYYY'), 'Current')
      ) as "duration",
      total_amount as "totalPayoutAmount",
      '/api/download/hub-payout-csv' as "downloadLink"
    FROM grouped_payouts;
  `;

  return hubPayoutHistory;
}
