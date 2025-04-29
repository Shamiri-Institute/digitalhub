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
        executed_at as payout_date,
        SUM(amount) as total_amount,
        LEAD(executed_at) OVER (ORDER BY executed_at) as next_payout_date
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
        COALESCE(TO_CHAR(next_payout_date, 'DD/MM/YYYY'), 'Current')
      ) as "duration",
      total_amount as "totalPayoutAmount",
      CONCAT(
        ${process.env.NEXT_PUBLIC_APP_URL},
        '/api/payouts/download?executedAt=',
        TO_CHAR(payout_date, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
      ) as "downloadLink"
    FROM grouped_payouts;
  `;

  return opsHubsPayoutHistory;
}

export async function triggerPayoutAction() {
  console.log("triggerPayoutAction");
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
