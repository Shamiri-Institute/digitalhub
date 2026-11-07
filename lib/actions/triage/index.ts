"use server";

import { and, eq, inArray } from "drizzle-orm";
import { refresh } from "next/cache";
import {
  type TriageEventFormData,
  TriageEventSchema,
  triageActionNeedsHandoff,
  triageActionNeedsSupervisor,
} from "#/app/(platform)/hc/schemas";
import { db, type Transaction } from "#/db/client";
import { ImplementerRole } from "#/db/enums";
import {
  interventionGroup,
  interventionSession,
  type JsonValue,
  student,
  supervisor,
  triageEvent,
  triageEventAudit,
} from "#/db/schema";
import { NotFoundError, requireAuthRole } from "#/lib/auth/require-auth-role";

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

function loadTriageEvent(cursor: typeof db | Transaction, id: string) {
  return cursor.query.triageEvent.findFirst({
    where: (t, { eq }) => eq(t.id, id),
    with: triageEventWith,
  });
}

/**
 * The columns a triage form sets. A field the outcome or action does not ask for is stored as null,
 * even when the form still holds a value from an earlier choice.
 */
function triageEventValues(parsed: TriageEventFormData) {
  return {
    riskScreenOutcome: parsed.riskScreenOutcome,
    riskNotCompletedReason:
      parsed.riskScreenOutcome === "NOT_COMPLETED" ? (parsed.riskNotCompletedReason ?? null) : null,
    actionTaken: parsed.actionTaken,
    referredSupervisorId: triageActionNeedsSupervisor(parsed.actionTaken)
      ? (parsed.referredSupervisorId ?? null)
      : null,
    supervisorHandoffStatus: triageActionNeedsHandoff(parsed.actionTaken)
      ? (parsed.supervisorHandoffStatus ?? null)
      : null,
    note: parsed.note ?? null,
  };
}

/**
 * Refuses a referral to anyone but a supervisor of the session's hub, the supervisors the triage
 * form offers. The fellow picks the supervisor, so the action cannot take it on trust.
 */
async function requireSupervisorInSessionHub(
  tx: Transaction | typeof db,
  referredSupervisorId: string | null,
  sessionId: string,
) {
  if (referredSupervisorId === null) {
    return;
  }
  const [referred] = await tx
    .select({ id: supervisor.id })
    .from(supervisor)
    .innerJoin(interventionSession, eq(interventionSession.hubId, supervisor.hubId))
    .where(and(eq(supervisor.id, referredSupervisorId), eq(interventionSession.id, sessionId)));
  if (!referred) {
    throw new NotFoundError("Supervisor");
  }
}

async function getFellowContext() {
  const { userId, identifier } = await requireAuthRole(ImplementerRole.FELLOW);
  if (!identifier) {
    throw new Error("Only fellows can document triage events");
  }
  return { fellowId: identifier, userId };
}

/**
 * The students a fellow triages at a session: the students of the groups the fellow leads at the
 * session's school. It is a subquery, so each read or write stays one statement.
 */
function studentsInLedGroupsAtSession(callerFellowId: string, sessionId: string) {
  return db
    .select({ id: student.id })
    .from(student)
    .innerJoin(interventionGroup, eq(interventionGroup.id, student.assignedGroupId))
    .innerJoin(interventionSession, eq(interventionSession.schoolId, interventionGroup.schoolId))
    .where(
      and(eq(interventionGroup.leaderId, callerFellowId), eq(interventionSession.id, sessionId)),
    );
}

export async function getSupervisorsInFellowHub(
  sessionId: string,
): Promise<{ id: string; supervisorName: string | null }[]> {
  const { fellowId: callerFellowId } = await getFellowContext();
  const session = await db.query.interventionSession.findFirst({
    where: (s, { and, eq, inArray }) =>
      and(
        eq(s.id, sessionId),
        inArray(
          s.schoolId,
          db
            .select({ id: interventionGroup.schoolId })
            .from(interventionGroup)
            .where(eq(interventionGroup.leaderId, callerFellowId)),
        ),
      ),
    columns: { hubId: true },
  });
  if (!session) {
    return [];
  }

  const supervisors = await db.query.supervisor.findMany({
    where: (s, { eq }) => eq(s.hubId, session.hubId),
    columns: { id: true, supervisorName: true },
    orderBy: (s, { asc }) => asc(s.supervisorName),
  });
  return supervisors.map((s) => ({
    id: s.id,
    supervisorName: s.supervisorName,
  }));
}

export async function getTriageEventByStudentAndSession(studentId: string, sessionId: string) {
  const { fellowId: callerFellowId } = await getFellowContext();
  const event = await db.query.triageEvent.findFirst({
    where: (t, { and, eq, inArray }) =>
      and(
        eq(t.studentId, studentId),
        eq(t.sessionId, sessionId),
        inArray(t.studentId, studentsInLedGroupsAtSession(callerFellowId, sessionId)),
      ),
    with: triageEventWith,
  });
  return event ?? null;
}

export async function getTriageEventsForSession(sessionId: string) {
  const { fellowId: callerFellowId } = await getFellowContext();
  const events = await db.query.triageEvent.findMany({
    where: (t, { and, eq, inArray }) =>
      and(
        eq(t.sessionId, sessionId),
        inArray(t.studentId, studentsInLedGroupsAtSession(callerFellowId, sessionId)),
      ),
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
    const { fellowId, userId } = await getFellowContext();
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

    const studentInLedGroup = await db.$count(
      student,
      and(
        eq(student.id, parsed.studentId),
        inArray(student.id, studentsInLedGroupsAtSession(fellowId, parsed.sessionId)),
      ),
    );
    if (!studentInLedGroup) {
      throw new NotFoundError("Student");
    }
    await requireSupervisorInSessionHub(
      db,
      triageEventValues(parsed).referredSupervisorId,
      parsed.sessionId,
    );

    const existing = await db.query.triageEvent.findFirst({
      where: (t, { and, eq }) =>
        and(eq(t.studentId, parsed.studentId), eq(t.sessionId, parsed.sessionId)),
    });
    if (existing) {
      return await updateTriageEvent(
        { ...parsed, id: existing.id },
        studentAttendanceId ?? existing.studentAttendanceId ?? undefined,
      );
    }

    const [created] = await db
      .insert(triageEvent)
      .values({
        studentId: parsed.studentId,
        sessionId: parsed.sessionId,
        fellowId,
        hubId: session.hubId,
        studentAttendanceId: studentAttendanceId ?? null,
        triageOccurred: true,
        ...triageEventValues(parsed),
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
    refresh();

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
    const { fellowId, userId } = await getFellowContext();
    const parsed = TriageEventSchema.parse(data);
    if (!data.id) {
      return { success: false, message: "Triage event ID is required for update." };
    }

    const event = await db.transaction(async (tx) => {
      // Locked, so a supervisor's review lands either before the edit reads it or after it.
      const [existing] = await tx
        .select()
        .from(triageEvent)
        .where(eq(triageEvent.id, data.id))
        .for("update");
      // A fellow edits only the events they documented; another fellow's event reads as missing.
      if (!existing || existing.fellowId !== fellowId) {
        throw new Error("Triage event not found.");
      }

      const values = triageEventValues(parsed);
      await requireSupervisorInSessionHub(tx, values.referredSupervisorId, existing.sessionId);
      // A review answers the supervisor the event was routed to. Routed to another, or to none,
      // the event waits for a review again; the audit row keeps the old one.
      const rerouted = values.referredSupervisorId !== existing.referredSupervisorId;
      const [updated] = await tx
        .update(triageEvent)
        .set({
          ...values,
          ...(rerouted && { reviewedById: null, reviewedAt: null, reviewNote: null }),
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
        beforeData: {
          riskScreenOutcome: existing.riskScreenOutcome,
          riskNotCompletedReason: existing.riskNotCompletedReason,
          actionTaken: existing.actionTaken,
          referredSupervisorId: existing.referredSupervisorId ?? undefined,
          supervisorHandoffStatus: existing.supervisorHandoffStatus,
          note: existing.note,
          ...(rerouted &&
            existing.reviewedAt && {
              reviewedById: existing.reviewedById,
              reviewedAt: existing.reviewedAt.toISOString(),
              reviewNote: existing.reviewNote,
            }),
        },
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
    refresh();

    return { success: true, message: "Triage updated.", data: event };
  } catch (err) {
    const message = (err as Error)?.message ?? "Failed to update triage event.";
    return { success: false, message };
  }
}
