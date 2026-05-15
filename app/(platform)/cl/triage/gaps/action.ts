"use server";

import { currentClinicalLead } from "#/app/auth";
import { db } from "#/lib/db";

export type EscalationGap = Awaited<ReturnType<typeof getEscalationGaps>>[number];

export async function getEscalationGaps() {
  const clinicalLead = await currentClinicalLead();
  if (!clinicalLead?.profile) throw new Error("Unauthorised");

  const hubId = clinicalLead.profile.assignedHubId;

  const gaps = await db.triageEvent.findMany({
    where: {
      riskScreenOutcome: "ANY_YES",
      hubId,
      student: { clinicalCases: { none: {} } },
    },
    include: {
      student: {
        select: {
          visibleId: true,
          studentName: true,
          school: { select: { schoolName: true } },
        },
      },
      fellow: { select: { fellowName: true } },
      referredSupervisor: { select: { supervisorName: true } },
    },
    orderBy: { createdAt: "asc" },
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
    db.triageEvent.count({
      where: { riskScreenOutcome: "ANY_YES", hubId },
    }),
    db.triageEvent.findMany({
      where: {
        riskScreenOutcome: "ANY_YES",
        hubId,
        student: { clinicalCases: { none: {} } },
      },
      select: { createdAt: true },
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
