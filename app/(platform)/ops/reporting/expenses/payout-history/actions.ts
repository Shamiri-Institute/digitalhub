"use server";

import { and, eq, inArray, isNull, or, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { currentOpsUser } from "#/app/auth";
import { db, queryRaw } from "#/db/client";
import { fellow, fellowAttendance, hub, interventionSession, payoutStatements } from "#/db/schema";
import { getActiveProjectId } from "#/lib/active-project-id";

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

export async function loadOpsHubsPayoutHistory(): Promise<OpsHubsPayoutHistoryType[]> {
  const opsUser = await currentOpsUser();

  if (!opsUser) {
    throw new Error("Unauthorised user");
  }

  const projectId = await getActiveProjectId();

  const payoutDates = await queryRaw<{
    dateAdded: Date;
    duration: string;
    totalPayoutAmount: number;
    downloadLink: string;
    confirmedAt: Date | null;
  }>(sql`
    WITH payout_groups AS (
      SELECT
        executed_at as payout_date,
        LEAD(executed_at) OVER (ORDER BY executed_at) as next_payout_date,
        SUM(amount) as total_amount
      FROM payout_statements ps
      WHERE fellow_id IN (
        SELECT f.id FROM fellows f
        INNER JOIN hubs h ON h.id = f.hub_id
        WHERE h.project_id =  ${projectId}
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
  `);

  const result = await Promise.all(
    payoutDates.map(async (payout) => {
      const fellowDetails = await queryRaw<FellowPayoutDetail>(sql`
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
        AND h.project_id = ${projectId}
        GROUP BY f.id, f.fellow_name, h.hub_name, s.supervisor_name, ps.mpesa_number
        ORDER BY f.fellow_name ASC;
      `);

      return {
        ...payout,
        fellowDetails,
      };
    }),
  );

  return result;
}

export async function triggerPayoutAction() {
  const opsUser = await currentOpsUser();

  if (!opsUser) {
    throw new Error("Unauthorised user");
  }

  const projectId = await getActiveProjectId();

  const currentTime = new Date();

  try {
    return await db.transaction(async (tx) => {
      const occurredSessionIds = tx
        .select({ id: interventionSession.id })
        .from(interventionSession)
        .where(eq(interventionSession.occurred, true));
      const activeFellowIdsInProject = tx
        .select({ id: fellow.id })
        .from(fellow)
        .where(
          and(
            or(eq(fellow.droppedOut, false), isNull(fellow.droppedOut)),
            inArray(
              fellow.hubId,
              tx.select({ id: hub.id }).from(hub).where(eq(hub.projectId, projectId)),
            ),
          ),
        );

      const eligibleAttendances = await tx.query.fellowAttendance.findMany({
        where: (a, { and, eq, isNull, inArray }) =>
          and(
            inArray(a.sessionId, occurredSessionIds),
            eq(a.attended, true),
            isNull(a.processedAt),
            inArray(a.fellowId, activeFellowIdsInProject),
          ),
        with: {
          fellow: true,
          session: { with: { session: true } },
          PayoutStatements: { where: (p, { isNull }) => isNull(p.executedAt) },
        },
      });

      if (eligibleAttendances.length === 0) {
        return {
          success: true,
          message: "No eligible attendances found to process",
        };
      }

      const fellowAttendanceIdsToProcess: number[] = [];
      for (const attendance of eligibleAttendances) {
        if (attendance.PayoutStatements.length > 0) {
          fellowAttendanceIdsToProcess.push(attendance.id);
        }
      }

      if (fellowAttendanceIdsToProcess.length === 0) {
        return {
          success: true,
          message: "No payout statements found to process for the eligible attendances",
        };
      }

      const updatedPayoutStatements = await tx
        .update(payoutStatements)
        .set({ executedAt: currentTime })
        .where(
          and(
            inArray(payoutStatements.fellowAttendanceId, fellowAttendanceIdsToProcess),
            isNull(payoutStatements.executedAt),
          ),
        )
        .returning({ id: payoutStatements.id });

      const updatedAttendances = await tx
        .update(fellowAttendance)
        .set({ processedAt: currentTime })
        .where(inArray(fellowAttendance.id, fellowAttendanceIdsToProcess))
        .returning({ id: fellowAttendance.id });

      const processedCount = updatedAttendances.length;
      const payoutStatementsCount = updatedPayoutStatements.length;

      if (processedCount === 0 && payoutStatementsCount === 0) {
        return {
          success: true,
          message: "No records were updated. Please check data consistency.",
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
      { cause: error },
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
    return await db.transaction(async (tx) => {
      const executedPayouts = await tx
        .select({ id: payoutStatements.id })
        .from(payoutStatements)
        .where(
          and(eq(payoutStatements.executedAt, executedAt), isNull(payoutStatements.confirmedAt)),
        );

      if (executedPayouts.length === 0) {
        return {
          success: true,
          message: "No executed payouts found to confirm for this date",
        };
      }

      const updatedPayouts = await tx
        .update(payoutStatements)
        .set({
          confirmedAt: currentTime,
          confirmedBy: opsUser.session.user.id,
        })
        .where(
          inArray(
            payoutStatements.id,
            executedPayouts.map((payout) => payout.id),
          ),
        )
        .returning({ id: payoutStatements.id });

      revalidatePath("/ops/reporting/expenses/payout-history");
      return {
        success: true,
        message: `Successfully confirmed ${updatedPayouts.length} payouts`,
      };
    });
  } catch (error) {
    console.error("Error in confirmPayoutAction:", error);
    throw new Error(
      "Failed to confirm payouts. Please try again or contact support if the issue persists.",
      { cause: error },
    );
  }
}
