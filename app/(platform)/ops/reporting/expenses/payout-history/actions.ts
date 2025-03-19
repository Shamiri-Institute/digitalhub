"use server";

import { currentOpsUser } from "#/app/auth";
import { db } from "#/lib/db";

export type OpsHubsPayoutHistoryType = Awaited<
  ReturnType<typeof loadOpsHubsPayoutHistory>
>[number];

export async function loadOpsHubsPayoutHistory() {
  const opsUser = await currentOpsUser();

  if (!opsUser) {
    throw new Error("Unauthorised user");
  }

  const opsHubsPayoutHistory = await db.$queryRaw<
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
        SELECT id FROM fellows WHERE implementer_id = ${opsUser.implementerId}
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
      '/api/download/payout-csv' as "downloadLink"
    FROM grouped_payouts;
  `;

  return opsHubsPayoutHistory;
}
