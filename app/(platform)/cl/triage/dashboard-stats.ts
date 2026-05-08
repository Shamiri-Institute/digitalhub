"use server";

import { currentClinicalLead } from "#/app/auth";
import { db } from "#/lib/db";

export async function getClinicalLeadTriageStats() {
  const clinicalLead = await currentClinicalLead();
  if (!clinicalLead?.profile) throw new Error("Unauthorised");

  const hubId = clinicalLead.profile.assignedHubId;

  const [allEscalations, sessionsInHub, fellowsWithSessions] = await Promise.all([
    db.triageEvent.findMany({
      where: { riskScreenOutcome: "ANY_YES", hubId },
      select: { studentId: true, actionTaken: true, createdAt: true, reviewedAt: true },
    }),
    db.interventionSession.findMany({
      where: { hubId },
      select: {
        id: true,
        triageEvents: { select: { id: true } },
      },
    }),
    db.fellow.findMany({
      where: { hubId },
      select: {
        id: true,
        fellowAttendances: {
          where: { attended: true },
          select: { sessionId: true },
        },
        triageEvents: { select: { id: true } },
      },
    }),
  ]);

  const studentIds = Array.from(new Set(allEscalations.map((e) => e.studentId)));
  const cases = await db.clinicalScreeningInfo.findMany({
    where: { studentId: { in: studentIds } },
    select: { studentId: true },
  });
  const caseStudentIds = new Set(cases.map((c) => c.studentId));

  const gaps = allEscalations.filter((e) => !caseStudentIds.has(e.studentId) && !e.reviewedAt);

  const unactionedCount = gaps.length;
  const overdueCount = gaps.filter(
    (g) => Math.floor((Date.now() - g.createdAt.getTime()) / 86_400_000) > 3,
  ).length;

  const totalSessions = sessionsInHub.length;
  const sessionsWithTriage = sessionsInHub.filter((s) => s.triageEvents.length > 0).length;
  const completionRate =
    totalSessions > 0 ? Math.round((sessionsWithTriage / totalSessions) * 100) : 100;

  const escalated = allEscalations.filter((e) => e.actionTaken === "ESCALATED").length;
  const escalationCompliance =
    allEscalations.length > 0 ? Math.round((escalated / allEscalations.length) * 100) : 100;

  const fellowsZeroTriage = fellowsWithSessions.filter((f) => {
    const sessions = new Set(f.fellowAttendances.map((a) => a.sessionId)).size;
    return sessions > 3 && f.triageEvents.length === 0;
  }).length;

  return {
    unactionedCount,
    overdueCount,
    completionRate,
    escalationCompliance,
    fellowsZeroTriage,
  };
}
