"use server";

import { currentSupervisor } from "#/app/auth";
import { db } from "#/lib/db";

export type FellowPayoutDetail = {
  fellowName: string;
  hub: string;
  supervisorName: string;
  mpesaNumber: string;
  totalAmount: number;
};

export type SupervisorPayoutHistoryType = {
  dateAdded: Date;
  duration: string;
  totalPayoutAmount: number;
  fellowDetails: FellowPayoutDetail[];
};

export async function loadSupervisorPayoutHistory(): Promise<
  SupervisorPayoutHistoryType[]
> {
  const supervisor = await currentSupervisor();

  if (!supervisor) {
    throw new Error("Unauthorised user");
  }

  const payoutDates = await db.$queryRaw<
    Array<{
      dateAdded: Date;
      duration: string;
      totalPayoutAmount: number;
      downloadLink: string;
    }>
  >`
    WITH payout_groups AS (
      SELECT 
        executed_at as payout_date,
        LEAD(executed_at) OVER (ORDER BY executed_at) as next_payout_date,
        SUM(amount) as total_amount
      FROM payout_statements ps
      WHERE fellow_id IN (
        SELECT id FROM fellows WHERE supervisor_id = ${supervisor.id}
      )
      AND executed_at IS NOT NULL
      GROUP BY executed_at
      ORDER BY executed_at DESC
    )
    SELECT 
      payout_date as "dateAdded",
      CONCAT(
        TO_CHAR(payout_date, 'DD/MM/YYYY'),
        ' - ',
        COALESCE(TO_CHAR(next_payout_date, 'DD/MM/YYYY'), 'N/A')
      ) as "duration",
      total_amount as "totalPayoutAmount"
    FROM payout_groups;
  `;

  const result = await Promise.all(
    payoutDates.map(async (payout) => {
      const fellowDetails = await db.$queryRaw<FellowPayoutDetail[]>`
        SELECT 
          f.fellow_name as "fellowName",
          h.hub_name as "hub",
          s.supervisor_name as "supervisorName",
          ps.mpesa_number as "mpesaNumber",
          SUM(ps.amount) as "totalAmount"
        FROM payout_statements ps
        JOIN fellows f ON f.id = ps.fellow_id
        JOIN hubs h ON h.id = f.hub_id
        JOIN supervisors s ON s.id = f.supervisor_id
        WHERE ps.executed_at = ${payout.dateAdded}
        AND f.supervisor_id = ${supervisor.id}
        GROUP BY f.id, f.fellow_name, h.hub_name, s.supervisor_name, ps.mpesa_number
        ORDER BY f.fellow_name ASC;
      `;

      return {
        ...payout,
        fellowDetails,
      } as SupervisorPayoutHistoryType;
    }),
  );

  return result;
}
