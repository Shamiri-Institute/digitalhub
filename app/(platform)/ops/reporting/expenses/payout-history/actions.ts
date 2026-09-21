"use server";

import { and, asc, desc, eq, inArray, isNotNull, isNull, max, or, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { currentOpsUser } from "#/app/auth";
import { db } from "#/db/client";
import {
  fellow,
  fellowAttendance,
  hub,
  interventionSession,
  payoutStatements,
  supervisor,
} from "#/db/schema";
import { getActiveProjectId } from "#/lib/active-project-id";

export type OpsHubsPayoutHistoryType = Awaited<ReturnType<typeof loadOpsHubsPayoutHistory>>[number];
export type FellowPayoutDetail = OpsHubsPayoutHistoryType["fellowDetails"][number];

export async function loadOpsHubsPayoutHistory() {
  const opsUser = await currentOpsUser();

  if (!opsUser) {
    throw new Error("Unauthorised user");
  }

  const projectId = await getActiveProjectId();

  const projectFellowIds = db
    .select({ id: fellow.id })
    .from(fellow)
    .innerJoin(hub, eq(hub.id, fellow.hubId))
    .where(eq(hub.projectId, projectId));
  const nextPayoutDate = sql`lead(${payoutStatements.executedAt}) over (order by ${payoutStatements.executedAt})`;
  const payoutDates = await db
    .select({
      // Filtered to non-null below; `mapWith` keeps the column's timestamp decoding.
      dateAdded: sql<Date>`${payoutStatements.executedAt}`.mapWith(payoutStatements.executedAt),
      duration: sql<string>`concat(to_char(${payoutStatements.executedAt}, 'DD/MM/YYYY'), ' - ', coalesce(to_char(${nextPayoutDate}, 'DD/MM/YYYY'), 'N/A'))`,
      totalPayoutAmount: sql<number>`sum(${payoutStatements.amount})`.mapWith(Number),
      // Every statement of one payout is confirmed together, so the group shares one value.
      confirmedAt: max(payoutStatements.confirmedAt),
    })
    .from(payoutStatements)
    .where(
      and(
        inArray(payoutStatements.fellowId, projectFellowIds),
        isNotNull(payoutStatements.executedAt),
      ),
    )
    .groupBy(payoutStatements.executedAt)
    .orderBy(desc(payoutStatements.executedAt));

  // One query for every payout date; rows are split per date in JS below.
  const details = await db
    .select({
      executedAt: payoutStatements.executedAt,
      fellowName: fellow.fellowName,
      fellowMpesaName: fellow.mpesaName,
      hub: hub.hubName,
      supervisorName: supervisor.supervisorName,
      mpesaNumber: payoutStatements.mpesaNumber,
      totalAmount: sql<number>`sum(${payoutStatements.amount})`.mapWith(Number),
    })
    .from(payoutStatements)
    .innerJoin(fellow, eq(fellow.id, payoutStatements.fellowId))
    .innerJoin(hub, eq(hub.id, fellow.hubId))
    .innerJoin(supervisor, eq(supervisor.id, fellow.supervisorId))
    .where(and(isNotNull(payoutStatements.executedAt), eq(hub.projectId, projectId)))
    .groupBy(
      payoutStatements.executedAt,
      fellow.id,
      fellow.fellowName,
      hub.hubName,
      supervisor.supervisorName,
      payoutStatements.mpesaNumber,
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
