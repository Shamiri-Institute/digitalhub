"use server";

import { and, eq, notExists } from "drizzle-orm";
import { currentClinicalLead } from "#/app/auth";
import { db } from "#/db/client";
import { clinicalScreeningInfo, triageEvent } from "#/db/schema";

export type EscalationGap = Awaited<ReturnType<typeof getEscalationGaps>>[number];

type TriageEventColumns = typeof triageEvent._.columns;

/** Risk-positive triage events in the hub whose student has no clinical case. */
const escalationGapsWhere = (hubId: string) => (t: TriageEventColumns) =>
  and(
    eq(t.riskScreenOutcome, "ANY_YES"),
    eq(t.hubId, hubId),
    notExists(
      db
        .select({ id: clinicalScreeningInfo.id })
        .from(clinicalScreeningInfo)
        .where(eq(clinicalScreeningInfo.studentId, t.studentId)),
    ),
  );

export async function getEscalationGaps() {
  const clinicalLead = await currentClinicalLead();
  if (!clinicalLead?.profile) throw new Error("Unauthorised");

  const hubId = clinicalLead.profile.assignedHubId;

  const gaps = await db.query.triageEvent.findMany({
    where: escalationGapsWhere(hubId),
    with: {
      student: {
        columns: { visibleId: true, studentName: true },
        with: { school: { columns: { schoolName: true } } },
      },
      fellow: { columns: { fellowName: true } },
      referredSupervisor: { columns: { supervisorName: true } },
    },
    orderBy: (t, { asc }) => asc(t.createdAt),
  });

  return gaps.map((g) => ({
    ...g,
    daysSince: Math.floor((Date.now() - g.createdAt.getTime()) / 86_400_000),
  }));
}

export async function getGapReportStats() {
  const clinicalLead = await currentClinicalLead();
  if (!clinicalLead?.profile) throw new Error("Unauthorised");

  const hubId = clinicalLead.profile.assignedHubId;

  const [totalEscalations, gaps] = await Promise.all([
    db.$count(
      triageEvent,
      and(eq(triageEvent.riskScreenOutcome, "ANY_YES"), eq(triageEvent.hubId, hubId)),
    ),
    db.query.triageEvent.findMany({
      where: escalationGapsWhere(hubId),
      columns: { createdAt: true },
    }),
  ]);

  const gapsWithDays = gaps.map((g) => ({
    daysSince: Math.floor((Date.now() - g.createdAt.getTime()) / 86_400_000),
  }));

  return {
    totalEscalations,
    totalGaps: gaps.length,
    overdueCount: gapsWithDays.filter((g) => g.daysSince > 3).length,
    criticalCount: gapsWithDays.filter((g) => g.daysSince > 7).length,
    conversionRate:
      totalEscalations > 0
        ? Math.round(((totalEscalations - gaps.length) / totalEscalations) * 100)
        : 100,
  };
}
