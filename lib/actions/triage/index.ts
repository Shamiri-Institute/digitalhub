"use server";

import { and, eq } from "drizzle-orm";
import { type TriageEventFormData, TriageEventSchema } from "#/app/(platform)/hc/schemas";
import { currentFellow, getCurrentPersonnel } from "#/app/auth";
import { type DatabaseCursor, db } from "#/db/client";
import { type JsonValue, triageEvent, triageEventAudit } from "#/db/schema";

const triageEventWith = {
  session: true,
  student: true,
  fellow: true,
  referredSupervisor: true,
} as const;

type JsonObject = { [key: string]: JsonValue | undefined };

export type TriageEventWithRelations = NonNullable<
  Awaited<ReturnType<typeof getTriageEventByStudentAndSession>>
>;

function loadTriageEvent(cursor: DatabaseCursor, id: string) {
  return cursor.query.triageEvent.findFirst({
    where: (t, { eq }) => eq(t.id, id),
    with: triageEventWith,
  });
}

async function getFellowContext() {
  const user = await getCurrentPersonnel();
  if (!user) {
    throw new Error("Not authenticated");
  }
  const fellow = await currentFellow();
  if (!fellow?.profile) {
    throw new Error("Only fellows can document triage events");
  }
  const userId = user.session.user.id;
  if (!userId) {
    throw new Error("User ID not found");
  }
  return {
    fellowId: fellow.profile.id,
    hubId: fellow.profile.hubId ?? undefined,
    userId,
  };
}

export async function getSupervisorsInFellowHub(
  sessionIdOrHubId?: string,
  options?: { useAsHubId?: boolean },
): Promise<{ id: string; supervisorName: string | null }[]> {
  let hubId: string | undefined;

  if (options?.useAsHubId && sessionIdOrHubId) {
    const user = await getCurrentPersonnel();
    if (!user) return [];
    hubId = sessionIdOrHubId;
  } else {
    try {
      const ctx = await getFellowContext();
      hubId = ctx.hubId;
    } catch {
      return [];
    }

    if (!hubId && sessionIdOrHubId) {
      const session = await db.query.interventionSession.findFirst({
        where: (s, { eq }) => eq(s.id, sessionIdOrHubId),
        columns: { hubId: true },
      });
      hubId = session?.hubId ?? undefined;
    }
  }

  if (!hubId) {
    return [];
  }
  const resolvedHubId = hubId;

  const supervisors = await db.query.supervisor.findMany({
    where: (s, { eq }) => eq(s.hubId, resolvedHubId),
    columns: { id: true, supervisorName: true },
    orderBy: (s, { asc }) => asc(s.supervisorName),
  });
  return supervisors.map((s) => ({
    id: s.id,
    supervisorName: s.supervisorName,
  }));
}

export async function getTriageEventByStudentAndSession(studentId: string, sessionId: string) {
  await getFellowContext();
  const event = await db.query.triageEvent.findFirst({
    where: (t, { and, eq }) => and(eq(t.studentId, studentId), eq(t.sessionId, sessionId)),
    with: triageEventWith,
  });
  return event ?? null;
}

export async function getTriageEventsForSession(sessionId: string) {
  await getFellowContext();
  const events = await db.query.triageEvent.findMany({
    where: (t, { eq }) => eq(t.sessionId, sessionId),
    with: triageEventWith,
  });
  return events;
}

export async function getStudentTriageHistory(studentId: string) {
  const { fellowId } = await getFellowContext();
  return db.query.triageEvent.findMany({
    where: (t, { and, eq }) => and(eq(t.studentId, studentId), eq(t.fellowId, fellowId)),
    with: {
      session: {
        columns: { sessionDate: true, sessionName: true, sessionType: true },
        with: { session: { columns: { sessionLabel: true } } },
      },
    },
    orderBy: (t, { desc }) => desc(t.createdAt),
  });
}

export async function createTriageEvent(
  data: TriageEventFormData,
  studentAttendanceId?: number,
): Promise<{ success: boolean; message: string; data?: TriageEventWithRelations }> {
  try {
    const { fellowId, hubId, userId } = await getFellowContext();
    const parsed = TriageEventSchema.parse(data);

    const session = await db.query.interventionSession.findFirst({
      where: (s, { eq }) => eq(s.id, parsed.sessionId),
      columns: { occurred: true, hubId: true },
    });
    if (!session) {
      throw new Error("Intervention session not found.");
    }
    if (!session.occurred) {
      return { success: false, message: "This session has not occurred yet." };
    }

    const existing = await db.query.triageEvent.findFirst({
      where: (t, { and, eq }) =>
        and(eq(t.studentId, parsed.studentId), eq(t.sessionId, parsed.sessionId)),
    });
    if (existing) {
      return updateTriageEvent(
        { ...parsed, id: existing.id },
        studentAttendanceId ?? existing.studentAttendanceId ?? undefined,
      );
    }

    const effectiveHubId = hubId ?? session.hubId;

    const [created] = await db
      .insert(triageEvent)
      .values({
        studentId: parsed.studentId,
        sessionId: parsed.sessionId,
        fellowId,
        hubId: effectiveHubId,
        studentAttendanceId: studentAttendanceId ?? null,
        triageOccurred: true,
        riskScreenOutcome: parsed.riskScreenOutcome,
        riskNotCompletedReason: parsed.riskNotCompletedReason ?? null,
        actionTaken: parsed.actionTaken,
        referredSupervisorId: parsed.referredSupervisorId ?? null,
        supervisorHandoffStatus: parsed.supervisorHandoffStatus ?? null,
        note: parsed.note ?? null,
        metadata: { createdBy: userId },
      })
      .returning({ id: triageEvent.id });
    if (!created) {
      throw new Error("Failed to save triage event.");
    }
    const event = await loadTriageEvent(db, created.id);
    if (!event) {
      throw new Error("Failed to save triage event.");
    }

    return { success: true, message: "Triage documented.", data: event };
  } catch (err) {
    const message = (err as Error)?.message ?? "Failed to save triage event.";
    return { success: false, message };
  }
}

export async function updateTriageEvent(
  data: TriageEventFormData & { id: string },
  studentAttendanceId?: number,
): Promise<{ success: boolean; message: string; data?: TriageEventWithRelations }> {
  try {
    const { userId } = await getFellowContext();
    const parsed = TriageEventSchema.parse(data);
    if (!data.id) {
      return { success: false, message: "Triage event ID is required for update." };
    }

    const existing = await db.query.triageEvent.findFirst({
      where: (t, { eq }) => eq(t.id, data.id),
    });
    if (!existing) {
      throw new Error("Triage event not found.");
    }

    const beforeData: JsonObject = {
      riskScreenOutcome: existing.riskScreenOutcome,
      riskNotCompletedReason: existing.riskNotCompletedReason,
      actionTaken: existing.actionTaken,
      referredSupervisorId: existing.referredSupervisorId ?? undefined,
      supervisorHandoffStatus: existing.supervisorHandoffStatus,
      note: existing.note,
    };

    const event = await db.transaction(async (tx) => {
      const [updated] = await tx
        .update(triageEvent)
        .set({
          riskScreenOutcome: parsed.riskScreenOutcome,
          riskNotCompletedReason: parsed.riskNotCompletedReason ?? null,
          actionTaken: parsed.actionTaken,
          referredSupervisorId: parsed.referredSupervisorId ?? null,
          supervisorHandoffStatus: parsed.supervisorHandoffStatus ?? null,
          note: parsed.note ?? null,
          ...(studentAttendanceId !== undefined && {
            studentAttendanceId: studentAttendanceId ?? null,
          }),
          metadata: {
            ...(existing.metadata as JsonObject),
            lastEditedBy: userId,
          },
        })
        .where(eq(triageEvent.id, data.id))
        .returning();
      if (!updated) {
        throw new Error("Triage event not found.");
      }

      await tx.insert(triageEventAudit).values({
        triageEventId: data.id,
        editedById: userId,
        beforeData,
        afterData: {
          riskScreenOutcome: updated.riskScreenOutcome ?? undefined,
          riskNotCompletedReason: updated.riskNotCompletedReason ?? undefined,
          actionTaken: updated.actionTaken ?? undefined,
          referredSupervisorId: updated.referredSupervisorId ?? undefined,
          supervisorHandoffStatus: updated.supervisorHandoffStatus ?? undefined,
          note: updated.note ?? undefined,
        },
      });

      const withRelations = await loadTriageEvent(tx, data.id);
      if (!withRelations) {
        throw new Error("Triage event not found.");
      }
      return withRelations;
    });

    return { success: true, message: "Triage updated.", data: event };
  } catch (err) {
    const message = (err as Error)?.message ?? "Failed to update triage event.";
    return { success: false, message };
  }
}

export async function requireTriageCompleteForSubmission(
  studentId: string,
  sessionId: string,
  triageOccurred: boolean,
): Promise<{ valid: boolean; message?: string }> {
  if (!triageOccurred) {
    return { valid: true };
  }
  const event = await db.query.triageEvent.findFirst({
    where: and(eq(triageEvent.studentId, studentId), eq(triageEvent.sessionId, sessionId)),
  });
  if (!event) {
    return { valid: false, message: "Please document triage before submitting attendance." };
  }
  if (!event.riskScreenOutcome || !event.actionTaken) {
    return { valid: false, message: "Triage documentation is incomplete." };
  }
  if (event.riskScreenOutcome === "NOT_COMPLETED" && !event.riskNotCompletedReason) {
    return { valid: false, message: "Reason for risk screen not completed is required." };
  }
  const needsHandoff = ["REFERRED", "ESCALATED", "REFUSED"].includes(event.actionTaken ?? "");
  if (needsHandoff && !event.supervisorHandoffStatus) {
    return { valid: false, message: "Supervisor handoff status is required." };
  }
  return { valid: true };
}
