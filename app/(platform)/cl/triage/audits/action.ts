"use server";

import { currentClinicalLead } from "#/app/auth";
import { db } from "#/lib/db";

export type AuditRow = Awaited<ReturnType<typeof getTriageAuditTrail>>[number];

export async function getTriageAuditTrail() {
  const clinicalLead = await currentClinicalLead();
  if (!clinicalLead?.profile) throw new Error("Unauthorised");

  const hubId = clinicalLead.profile.assignedHubId;

  const audits = await db.triageEventAudit.findMany({
    where: {
      triageEvent: { hubId },
    },
    include: {
      triageEvent: {
        select: {
          fellow: { select: { fellowName: true } },
          session: { select: { sessionDate: true, sessionName: true, sessionType: true } },
        },
      },
      editedBy: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return audits.map((audit) => {
    const sessionDate = audit.triageEvent.session?.sessionDate;
    const hoursAfterSession = sessionDate
      ? Math.round((audit.createdAt.getTime() - new Date(sessionDate).getTime()) / 3_600_000)
      : null;

    const before = (audit.beforeData ?? {}) as Record<string, unknown>;
    const after = (audit.afterData ?? {}) as Record<string, unknown>;
    const changedFields = Object.keys({ ...before, ...after }).filter(
      (key) => JSON.stringify(before[key]) !== JSON.stringify(after[key]),
    );

    return {
      id: audit.id,
      editedAt: audit.createdAt,
      editedByName: audit.editedBy?.name ?? "Unknown",
      fellowName: audit.triageEvent.fellow?.fellowName ?? "—",
      sessionDate: sessionDate ?? null,
      sessionLabel:
        audit.triageEvent.session?.sessionName ?? audit.triageEvent.session?.sessionType ?? "—",
      hoursAfterSession,
      changedFields,
      before,
      after,
    };
  });
}
