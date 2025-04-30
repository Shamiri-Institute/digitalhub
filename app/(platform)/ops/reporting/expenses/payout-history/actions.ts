"use server";

import { currentOpsUser } from "#/app/auth";
import { db } from "#/lib/db";
import { revalidatePath } from "next/cache";

export type FellowPayoutDetail = {
  fellowName: string;
  hub: string;
  supervisorName: string;
  mpesaNumber: string;
  totalAmount: number;
};

export type OpsHubsPayoutHistoryType = {
  dateAdded: Date;
  duration: string;
  totalPayoutAmount: number;
  downloadLink: string;
  fellowDetails: FellowPayoutDetail[];
};

export async function loadOpsHubsPayoutHistory(): Promise<
  OpsHubsPayoutHistoryType[]
> {
  const opsUser = await currentOpsUser();

  if (!opsUser) {
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
        SELECT id FROM fellows WHERE implementer_id = ${opsUser.implementerId}
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
        AND f.implementer_id = ${opsUser.implementerId}
        GROUP BY f.id, f.fellow_name, h.hub_name, s.supervisor_name, ps.mpesa_number
        ORDER BY f.fellow_name ASC;
      `;

      return {
        ...payout,
        fellowDetails,
      } as OpsHubsPayoutHistoryType;
    }),
  );

  return result;
}

export async function triggerPayoutAction() {
  const opsUser = await currentOpsUser();

  if (!opsUser) {
    throw new Error("Unauthorised user");
  }

  const currentTime = new Date();

  try {
    return await db.$transaction(async (tx) => {
      const eligibleAttendances = await tx.fellowAttendance.findMany({
        where: {
          session: {
            occurred: true,
          },
          attended: true,
          processedAt: null,
          fellow: {
            OR: [{ droppedOut: false }, { droppedOut: null }],
            implementerId: opsUser.implementerId,
          },
        },
        include: {
          fellow: true,
          session: {
            include: {
              session: true,
            },
          },
          PayoutStatements: {
            where: {
              executedAt: null,
            },
          },
        },
      });

      if (eligibleAttendances.length === 0) {
        return {
          success: true,
          message: "No eligible attendances found to process",
        };
      }

      let processedCount = 0;
      let payoutStatementsCount = 0;

      for (const attendance of eligibleAttendances) {
        // Skip if there are no payout statements to process
        if (attendance.PayoutStatements.length === 0) continue;

        await tx.fellowAttendance.update({
          where: { id: attendance.id },
          data: { processedAt: currentTime },
        });

        const updatedPayouts = await tx.payoutStatements.updateMany({
          where: {
            fellowAttendanceId: attendance.id,
            executedAt: null,
          },
          data: {
            executedAt: currentTime,
          },
        });

        processedCount++;
        payoutStatementsCount += updatedPayouts.count;
      }

      if (processedCount === 0) {
        return {
          success: true,
          message: "No payout statements found to process",
        };
      }
      revalidatePath("/ops/reporting/expenses/payout-history");
      return {
        success: true,
        message: `Successfully processed ${processedCount} attendances and ${payoutStatementsCount} payout statements`,
      };
    });
  } catch (error) {
    console.error("Error in triggerPayoutAction:", error);
    throw new Error(
      "Failed to process payouts. Please try again or contact support if the issue persists.",
    );
  }
}
