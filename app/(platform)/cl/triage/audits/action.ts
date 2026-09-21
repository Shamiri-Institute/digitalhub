"use server";

import { eq } from "drizzle-orm";
import { currentClinicalLead } from "#/app/auth";
import { db } from "#/db/client";
import { triageEvent } from "#/db/schema";

export type AuditRow = Awaited<ReturnType<typeof getTriageAuditTrail>>[number];

export async function getTriageAuditTrail() {
  const clinicalLead = await currentClinicalLead();
  if (!clinicalLead?.profile) throw new Error("Unauthorised");

  const hubId = clinicalLead.profile.assignedHubId;

  const audits = await db.query.triageEventAudit.findMany({
    where: (a, { inArray }) =>
      inArray(
        a.triageEventId,
        db.select({ id: triageEvent.id }).from(triageEvent).where(eq(triageEvent.hubId, hubId)),
      ),
    with: {
      triageEvent: {
        columns: {},
        with: {
          fellow: { columns: { fellowName: true } },
          session: { columns: { sessionDate: true, sessionName: true, sessionType: true } },
        },
      },
      editedBy: { columns: { name: true } },
    },
    orderBy: (a, { desc }) => desc(a.createdAt),
    limit: 200,
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
