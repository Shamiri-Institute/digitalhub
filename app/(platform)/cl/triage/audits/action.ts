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

  // The audit rows store supervisor and reviewer ids; the trail shows their names.
  const recorded = audits.flatMap((audit) => [audit.beforeData, audit.afterData]).map(asRecord);
  const supervisorIds = idsOf(recorded, "referredSupervisorId");
  const reviewerIds = idsOf(recorded, "reviewedById");
  const [supervisors, reviewers] = await Promise.all([
    supervisorIds.length === 0
      ? []
      : db.query.supervisor.findMany({
          where: (s, { inArray }) => inArray(s.id, supervisorIds),
          columns: { id: true, supervisorName: true },
        }),
    reviewerIds.length === 0
      ? []
      : db.query.user.findMany({
          where: (u, { inArray }) => inArray(u.id, reviewerIds),
          columns: { id: true, name: true },
        }),
  ]);
  const supervisorNames = new Map(supervisors.map((s) => [s.id, s.supervisorName]));
  const reviewerNames = new Map(reviewers.map((r) => [r.id, r.name]));
  function withNames(data: unknown) {
    const { referredSupervisorId, reviewedById, ...fields } = asRecord(data);
    return {
      ...fields,
      ...(typeof referredSupervisorId === "string" && {
        referredSupervisor: supervisorNames.get(referredSupervisorId) ?? "Unknown supervisor",
      }),
      ...(typeof reviewedById === "string" && {
        reviewedBy: reviewerNames.get(reviewedById) ?? "Unknown",
      }),
    };
  }

  return audits.map((audit) => {
    const sessionDate = audit.triageEvent.session?.sessionDate;
    const hoursAfterSession = sessionDate
      ? Math.round((audit.createdAt.getTime() - new Date(sessionDate).getTime()) / 3_600_000)
      : null;

    // Compared by id, since two supervisors can share a name. The before side stores an empty
    // field as null and the after side leaves it out.
    const recordedBefore = asRecord(audit.beforeData);
    const recordedAfter = asRecord(audit.afterData);
    const changedFields = Object.keys({ ...recordedBefore, ...recordedAfter })
      .filter(
        (key) =>
          JSON.stringify(recordedBefore[key] ?? null) !==
          JSON.stringify(recordedAfter[key] ?? null),
      )
      .map((key) => NAMED_FIELDS[key] ?? key);
    const before: Record<string, unknown> = withNames(recordedBefore);
    const after: Record<string, unknown> = withNames(recordedAfter);

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

/** The fields the trail shows by name in place of the id the audit row stores. */
const NAMED_FIELDS: Record<string, string> = {
  referredSupervisorId: "referredSupervisor",
  reviewedById: "reviewedBy",
};

function asRecord(data: unknown) {
  return (data ?? {}) as Record<string, unknown>;
}

function idsOf(recorded: Record<string, unknown>[], key: string) {
  return [
    ...new Set(
      recorded.map((data) => data[key]).filter((id): id is string => typeof id === "string"),
    ),
  ];
}
