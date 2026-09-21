"use server";

import { currentClinicalLead } from "#/app/auth";
import { db } from "#/db/client";

export type FidelityRow = Awaited<ReturnType<typeof getTriageFidelityData>>[number];

export async function getTriageFidelityData() {
  const clinicalLead = await currentClinicalLead();
  if (!clinicalLead?.profile) throw new Error("Unauthorised");

  const hubId = clinicalLead.profile.assignedHubId;

  const fellows = await db.query.fellow.findMany({
    where: (f, { eq }) => eq(f.hubId, hubId),
    columns: { id: true, fellowName: true },
    with: {
      supervisor: { columns: { supervisorName: true } },
      fellowAttendances: {
        where: (a, { eq }) => eq(a.attended, true),
        columns: { sessionId: true },
      },
      triageEvents: {
        columns: { id: true, riskScreenOutcome: true, actionTaken: true },
      },
      groups: {
        columns: {},
        with: { school: { columns: { schoolName: true } } },
      },
    },
  });

  return fellows.map((fellow) => {
    const sessionsAttended = new Set(fellow.fellowAttendances.map((a) => a.sessionId)).size;
    const triageEvents = fellow.triageEvents.length;
    const triageRate =
      sessionsAttended > 0 ? Math.round((triageEvents / sessionsAttended) * 100) : 0;

    const riskPositive = fellow.triageEvents.filter(
      (e) => e.riskScreenOutcome === "ANY_YES",
    ).length;
    const escalated = fellow.triageEvents.filter((e) => e.actionTaken === "ESCALATED").length;
    const escalationCompliance =
      riskPositive > 0 ? Math.round((escalated / riskPositive) * 100) : 100;

    const screenCompleted = fellow.triageEvents.filter(
      (e) => e.riskScreenOutcome !== "NOT_COMPLETED",
    ).length;
    const screenCompletionRate =
      triageEvents > 0 ? Math.round((screenCompleted / triageEvents) * 100) : 100;

    const schools = Array.from(
      new Set(fellow.groups.map((g) => g.school?.schoolName).filter((s): s is string => !!s)),
    ).join(", ");

    return {
      fellowId: fellow.id,
      fellowName: fellow.fellowName ?? "—",
      supervisorName: fellow.supervisor?.supervisorName ?? "—",
      schools: schools || "—",
      sessionsAttended,
      triageEvents,
      triageRate,
      triageRateFlag: triageEvents > 0 && (triageRate < 10 || triageRate > 80),
      riskPositive,
      escalated,
      escalationCompliance,
      complianceFlag: riskPositive > 0 && escalationCompliance < 95,
      screenCompletionRate,
    };
  });
}
