"use server";

import { currentOpsUser } from "#/app/auth";
import { CURRENT_PROJECT_ID } from "#/lib/constants";
import { db } from "#/lib/db";
import { revalidatePath } from "next/cache";

export type FellowPayoutDetail = {
  fellowName: string;
  fellowMpesaName: string;
  hub: string;
  supervisorName: string;
  mpesaNumber: string;
  totalAmount: number;
};

export type OpsHubsPayoutHistoryType = {
  dateAdded: Date;
  duration: string;
  totalPayoutAmount: number;
  fellowDetails: FellowPayoutDetail[];
  confirmedAt: Date | null;
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
      confirmedAt: Date | null;
    }>
  >`
    WITH payout_groups AS (
      SELECT 
        executed_at as payout_date,
        LEAD(executed_at) OVER (ORDER BY executed_at) as next_payout_date,
        SUM(amount) as total_amount
      FROM payout_statements ps
      WHERE fellow_id IN (
        SELECT f.id FROM fellows f
        INNER JOIN hubs h ON h.id = f.hub_id
        WHERE h.project_id =  ${CURRENT_PROJECT_ID}
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
      total_amount as "totalPayoutAmount",
      (
        SELECT confirmed_at
        FROM payout_statements
        WHERE executed_at = payout_date
        LIMIT 1
      ) as "confirmedAt"
    FROM payout_groups;
  `;

  const result = await Promise.all(
    payoutDates.map(async (payout) => {
      const fellowDetails = await db.$queryRaw<FellowPayoutDetail[]>`
        SELECT 
          f.fellow_name as "fellowName",
          f.mpesa_name as "fellowMpesaName",
          h.hub_name as "hub",
          s.supervisor_name as "supervisorName",
          ps.mpesa_number as "mpesaNumber",
          SUM(ps.amount) as "totalAmount"
        FROM payout_statements ps
        INNER JOIN fellows f ON f.id = ps.fellow_id
        INNER JOIN hubs h ON h.id = f.hub_id
        INNER JOIN supervisors s ON s.id = f.supervisor_id
        WHERE ps.executed_at = ${payout.dateAdded}
        AND h.project_id = ${CURRENT_PROJECT_ID}
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
    const result = await db.$transaction(async (tx) => {
      const eligibleAttendances = await tx.fellowAttendance.findMany({
        where: {
          session: {
            occurred: true,
          },
          attended: true,
          processedAt: null,
          fellow: {
            OR: [{ droppedOut: false }, { droppedOut: null }],
            hub: {
              projectId: CURRENT_PROJECT_ID,
            },
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

      // Process all updates in a single batch
      const attendanceIds = eligibleAttendances
        .filter((attendance) => attendance.PayoutStatements.length > 0)
        .map((attendance) => attendance.id);

      if (attendanceIds.length > 0) {
        // Update attendances in batch
        await tx.fellowAttendance.updateMany({
          where: {
            id: { in: attendanceIds },
          },
          data: { processedAt: currentTime },
        });

        // Update payout statements in batch
        const updatedPayouts = await tx.payoutStatements.updateMany({
          where: {
            fellowAttendanceId: { in: attendanceIds },
            executedAt: null,
          },
          data: {
            executedAt: currentTime,
          },
        });

        processedCount = attendanceIds.length;
        payoutStatementsCount = updatedPayouts.count;
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

    revalidatePath("/ops/reporting/expenses/payout-history");
    return result;
  } catch (error) {
    console.error("Error in triggerPayoutAction:", error);
    throw new Error(
      "Failed to process payouts. Please try again or contact support if the issue persists.",
    );
  }
}

export async function confirmPayoutAction(executedAt: Date) {
  const opsUser = await currentOpsUser();

  if (!opsUser) {
    throw new Error("Unauthorised user");
  }

  const currentTime = new Date();

  try {
    return await db.$transaction(async (tx) => {
      const executedPayouts = await tx.payoutStatements.findMany({
        where: {
          executedAt: executedAt,
          confirmedAt: null,
        },
      });

      if (executedPayouts.length === 0) {
        return {
          success: true,
          message: "No executed payouts found to confirm for this date",
        };
      }

      const updatedPayouts = await tx.payoutStatements.updateMany({
        where: {
          id: { in: executedPayouts.map((payout) => payout.id) },
        },
        data: {
          confirmedAt: currentTime,
          confirmedBy: opsUser.user.user.id,
        },
      });

      revalidatePath("/ops/reporting/expenses/payout-history");
      return {
        success: true,
        message: `Successfully confirmed ${updatedPayouts.count} payouts`,
      };
    });
  } catch (error) {
    console.error("Error in confirmPayoutAction:", error);
    throw new Error(
      "Failed to confirm payouts. Please try again or contact support if the issue persists.",
    );
  }
}
