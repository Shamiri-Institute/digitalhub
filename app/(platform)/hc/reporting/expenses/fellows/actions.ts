"use server";

import { currentHubCoordinator } from "#/app/auth";
import { asc, eq, type SQL, sql } from "drizzle-orm";
import { signOut } from "next-auth/react";
import { db } from "#/db/client";
import {
  fellow,
  fellowAttendance,
  interventionGroup,
  interventionSession,
  payoutStatements,
  school,
  sessionName,
  supervisor,
} from "#/db/schema";

export type HubFellowsAttendancesType = Awaited<ReturnType<typeof loadHubFellowAttendance>>[number];

export async function loadHubFellowAttendance() {
  const hubCoordinator = await currentHubCoordinator();

  if (!hubCoordinator) {
    throw new Error("Unauthorised user");
  }

  const hubId = hubCoordinator.profile?.assignedHubId;
  if (!hubId) {
    await signOut({ callbackUrl: "/login" });
    throw new Error("Unauthorised user");
  }
  const [fellows, payouts] = await Promise.all([
    db
      .select({
        id: fellow.id,
        fellowName: fellow.fellowName,
        mpesaNumber: fellow.mpesaNumber,
        supervisorName: supervisor.supervisorName,
        specialSession: attendancesWhere(sql`${sessionName.sessionType} = 'SPECIAL'`),
        preCount: attendancesWhere(sql`${sessionName.sessionLabel} = 's0'`),
        mainCount: attendancesWhere(sql`${sessionName.sessionLabel} in ('s1', 's2', 's3', 's4')`),
        trainingCount: attendancesWhere(sql`${sessionName.sessionType} = 'TRAINING'`),
        supervisionCount: attendancesWhere(sql`${sessionName.sessionType} = 'SUPERVISION'`),
        paidAmount: sql<number>`coalesce(sum(${payoutStatements.amount}) filter (where ${payoutStatements.confirmedAt} is not null), 0)::int`,
        totalAmount: sql<number>`coalesce(sum(${payoutStatements.amount}), 0)::int`,
      })
      .from(fellow)
      .leftJoin(supervisor, eq(supervisor.id, fellow.supervisorId))
      .leftJoin(fellowAttendance, eq(fellowAttendance.fellowId, fellow.id))
      .leftJoin(interventionSession, eq(interventionSession.id, fellowAttendance.sessionId))
      .leftJoin(sessionName, eq(sessionName.id, interventionSession.sessionId))
      .leftJoin(payoutStatements, eq(payoutStatements.fellowAttendanceId, fellowAttendance.id))
      .where(eq(fellow.hubId, hubId))
      .groupBy(fellow.id, supervisor.supervisorName)
      .orderBy(asc(fellow.fellowName), asc(fellow.id)),
    db
      .select({
        fellowId: fellowAttendance.fellowId,
        attended: fellowAttendance.attended,
        payout: {
          session: sessionName.sessionLabel,
          schoolVenue: school.schoolName,
          dateOfAttendance: interventionSession.sessionDate,
          dateMarked: fellowAttendance.updatedAt,
          group: interventionGroup.groupName,
          amount: payoutStatements.amount,
          executedAt: payoutStatements.executedAt,
          confirmedAt: payoutStatements.confirmedAt,
        },
      })
      .from(payoutStatements)
      .innerJoin(fellowAttendance, eq(fellowAttendance.id, payoutStatements.fellowAttendanceId))
      .innerJoin(fellow, eq(fellow.id, fellowAttendance.fellowId))
      .leftJoin(interventionSession, eq(interventionSession.id, fellowAttendance.sessionId))
      .leftJoin(sessionName, eq(sessionName.id, interventionSession.sessionId))
      .leftJoin(school, eq(school.id, fellowAttendance.schoolId))
      .leftJoin(interventionGroup, eq(interventionGroup.id, fellowAttendance.groupId))
      .where(eq(fellow.hubId, hubId))
      .orderBy(
        asc(interventionSession.sessionDate),
        asc(payoutStatements.createdAt),
        asc(payoutStatements.id),
      ),
  ]);
  const payoutsByFellow = Map.groupBy(payouts, (row) => row.fellowId);

  return fellows.map((hubFellow) => ({
    fellowName: hubFellow.fellowName,
    hub: hubCoordinator.profile.assignedHub?.hubName,
    supervisorName: hubFellow.supervisorName,
    specialSession: hubFellow.specialSession,
    preVsMain: `${hubFellow.preCount} - pre | ${hubFellow.mainCount} - main`,
    trainingSupervision: `${hubFellow.trainingCount} - T | ${hubFellow.supervisionCount} - SV`,
    paidAmount: hubFellow.paidAmount,
    totalAmount: hubFellow.totalAmount,
    attendances: (payoutsByFellow.get(hubFellow.id) ?? []).map(({ attended, payout }) => ({
      ...payout,
      fellowName: hubFellow.fellowName,
      mpesaNo: hubFellow.mpesaNumber,
      status: attended ? "Attended" : "Absent",
    })),
  }));
}

/** Attendances of the grouped fellow that match `condition`; the payout join repeats them. */
function attendancesWhere(condition: SQL) {
  return sql<number>`(count(distinct ${fellowAttendance.id}) filter (where ${condition}))::int`;
}
