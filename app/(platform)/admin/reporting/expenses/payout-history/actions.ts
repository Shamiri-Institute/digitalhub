"use server";

import { and, asc, desc, eq, inArray, isNotNull, isNull, max, or, sql } from "drizzle-orm";
import { refresh } from "next/cache";

import { db } from "#/db/client";
import {
  fellow,
  fellowAttendance,
  hub,
  interventionSession,
  payoutStatements,
  supervisor,
} from "#/db/schema";
import { requirePayoutScope } from "#/lib/auth/admin-access";
import { implementerHubsInProject } from "#/lib/auth/require-hub-role";

export type ImplementerPayoutHistoryType = Awaited<
  ReturnType<typeof loadImplementerPayoutHistory>
>[number];
export type FellowPayoutDetail = ImplementerPayoutHistoryType["fellowDetails"][number];

export async function loadImplementerPayoutHistory() {
  const { implementerId: adminImplementerId, projectId: adminProjectId } =
    await requirePayoutScope();
  const implementerHubIds = implementerHubsInProject(adminImplementerId, adminProjectId);
  const projectFellowAttendanceIds = db
    .select({ id: fellowAttendance.id })
    .from(fellowAttendance)
    .innerJoin(fellow, eq(fellow.id, fellowAttendance.fellowId))
    .where(inArray(fellow.hubId, implementerHubIds));
  const nextPayoutDate = sql`lead(${payoutStatements.executedAt}) over (order by ${payoutStatements.executedAt})`;
  const [payoutDates, details] = await Promise.all([
    db
      .select({
        id: sql<string>`${payoutStatements.executedAt}::text`,
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
          inArray(payoutStatements.fellowAttendanceId, projectFellowAttendanceIds),
          isNotNull(payoutStatements.executedAt),
        ),
      )
      .groupBy(payoutStatements.executedAt)
      .orderBy(desc(payoutStatements.executedAt)),

    db
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
      .innerJoin(fellowAttendance, eq(fellowAttendance.id, payoutStatements.fellowAttendanceId))
      .innerJoin(fellow, eq(fellow.id, fellowAttendance.fellowId))
      .innerJoin(hub, eq(hub.id, fellow.hubId))
      .innerJoin(supervisor, eq(supervisor.id, fellow.supervisorId))
      .where(and(isNotNull(payoutStatements.executedAt), inArray(hub.id, implementerHubIds)))
      .groupBy(
        payoutStatements.executedAt,
        fellow.id,
        fellow.fellowName,
        hub.hubName,
        supervisor.supervisorName,
        payoutStatements.mpesaNumber,
      )
      .orderBy(asc(fellow.fellowName)),
  ]);

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
  const { implementerId: adminImplementerId, projectId: adminProjectId } =
    await requirePayoutScope();
  const implementerHubIds = implementerHubsInProject(adminImplementerId, adminProjectId);
  const currentTime = new Date();

  try {
    const result = await db.transaction(async (tx) => {
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
            inArray(fellow.hubId, implementerHubIds),
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

      // Stamp only the attendances still attended and unprocessed when the row is written: an
      // unmark or another payout run that committed since the read above leaves its rows out,
      // and their statements stay unexecuted with them.
      const updatedAttendances = await tx
        .update(fellowAttendance)
        .set({ processedAt: currentTime })
        .where(
          and(
            inArray(fellowAttendance.id, fellowAttendanceIdsToProcess),
            eq(fellowAttendance.attended, true),
            isNull(fellowAttendance.processedAt),
          ),
        )
        .returning({ id: fellowAttendance.id });

      const updatedPayoutStatements =
        updatedAttendances.length === 0
          ? []
          : await tx
              .update(payoutStatements)
              .set({ executedAt: currentTime })
              .where(
                and(
                  inArray(
                    payoutStatements.fellowAttendanceId,
                    updatedAttendances.map((attendance) => attendance.id),
                  ),
                  isNull(payoutStatements.executedAt),
                ),
              )
              .returning({ id: payoutStatements.id });

      const processedCount = updatedAttendances.length;
      const payoutStatementsCount = updatedPayoutStatements.length;

      if (processedCount === 0 && payoutStatementsCount === 0) {
        return {
          success: true,
          message: "No records were updated. Please check data consistency.",
        };
      }

      return {
        success: true,
        message: `Successfully processed ${processedCount} attendances and ${payoutStatementsCount} payout statements`,
      };
    });
    refresh();
    return result;
  } catch (error) {
    console.error("Error in triggerPayoutAction:", error);
    throw new Error(
      "Failed to process payouts. Please try again or contact support if the issue persists.",
      { cause: error },
    );
  }
}

export async function confirmPayoutAction(executedAt: Date) {
  const {
    userId: confirmingUserId,
    implementerId: adminImplementerId,
    projectId: adminProjectId,
  } = await requirePayoutScope();
  const implementerHubIds = implementerHubsInProject(adminImplementerId, adminProjectId);
  const currentTime = new Date();

  try {
    const result = await db.transaction(async (tx) => {
      const projectFellowAttendanceIds = tx
        .select({ id: fellowAttendance.id })
        .from(fellowAttendance)
        .innerJoin(fellow, eq(fellow.id, fellowAttendance.fellowId))
        .where(inArray(fellow.hubId, implementerHubIds));
      const executedPayouts = await tx
        .select({ id: payoutStatements.id })
        .from(payoutStatements)
        .where(
          and(
            eq(payoutStatements.executedAt, executedAt),
            isNull(payoutStatements.confirmedAt),
            inArray(payoutStatements.fellowAttendanceId, projectFellowAttendanceIds),
          ),
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
          confirmedBy: confirmingUserId,
        })
        .where(
          inArray(
            payoutStatements.id,
            executedPayouts.map((payout) => payout.id),
          ),
        )
        .returning({ id: payoutStatements.id });

      return {
        success: true,
        message: `Successfully confirmed ${updatedPayouts.length} payouts`,
      };
    });
    refresh();
    return result;
  } catch (error) {
    console.error("Error in confirmPayoutAction:", error);
    throw new Error(
      "Failed to confirm payouts. Please try again or contact support if the issue persists.",
      { cause: error },
    );
  }
}
