"use server";

import { currentClinicalLead } from "#/app/auth";
import { db } from "#/lib/db";

export type HandoffRow = Awaited<ReturnType<typeof getHandoffQualityData>>[number];

export async function getHandoffQualityData() {
  const clinicalLead = await currentClinicalLead();
  if (!clinicalLead?.profile) throw new Error("Unauthorised");

  const hubId = clinicalLead.profile.assignedHubId;

  const supervisors = await db.supervisor.findMany({
    where: { hubId },
    select: {
      id: true,
      supervisorName: true,
      triageEventsReferred: {
        where: {
          actionTaken: { in: ["ESCALATED", "REFERRED", "REFUSED"] },
        },
        select: { supervisorHandoffStatus: true },
      },
    },
  });

  return supervisors
    .filter((s) => s.triageEventsReferred.length > 0)
    .map((sup) => {
      const events = sup.triageEventsReferred;
      const total = events.length;

      const count = (status: string) =>
        events.filter((e) => e.supervisorHandoffStatus === status).length;

      const warmHandoff = count("WARM_HANDOFF");
      const notified = count("SUPERVISOR_NOTIFIED");
      const couldNotReach = count("COULD_NOT_REACH");
      const refused = count("STUDENT_REFUSED_NOTIFIED");

      const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);

      return {
        supervisorId: sup.id,
        supervisorName: sup.supervisorName ?? "—",
        total,
        warmHandoff,
        warmHandoffPct: pct(warmHandoff),
        notified,
        notifiedPct: pct(notified),
        couldNotReach,
        couldNotReachPct: pct(couldNotReach),
        couldNotReachFlag: pct(couldNotReach) > 15,
        refused,
        refusedPct: pct(refused),
      };
    });
}
