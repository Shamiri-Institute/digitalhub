"use server";

import type { Prisma } from "@prisma/client";
import { randomBytes } from "crypto";
import type { z } from "zod";
import { type TriageEventFormData, TriageEventSchema } from "#/app/(platform)/hc/schemas";
import { currentFellow, getCurrentPersonnel } from "#/app/auth";
import { db } from "#/lib/db";

function generateRandomPseudonym(): string {
  return `TRG-${randomBytes(4).toString("hex")}`;
}

export type TriageEventWithRelations = Prisma.TriageEventGetPayload<{
  include: {
    session: true;
    student: true;
    fellow: true;
    referredSupervisor: true;
  };
}>;

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

/**
 * Returns supervisors in a hub for the triage supervisor dropdown.
 * When hubId is provided (e.g. from session), uses it directly (caller must be authenticated).
 * Otherwise uses fellow context and optionally session's hub when fellow.hubId is null.
 */
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
      const session = await db.interventionSession.findUnique({
        where: { id: sessionIdOrHubId },
        select: { hubId: true },
      });
      hubId = session?.hubId ?? undefined;
    }
  }

  if (!hubId) {
    return [];
  }

  const supervisors = await db.supervisor.findMany({
    where: { hubId },
    select: { id: true, supervisorName: true },
    orderBy: { supervisorName: "asc" },
  });
  return supervisors.map((s) => ({
    id: s.id,
    supervisorName: s.supervisorName,
  }));
}

export async function getTriageEventByStudentAndSession(studentId: string, sessionId: string) {
  await getFellowContext();
  const event = await db.triageEvent.findUnique({
    where: {
      studentId_sessionId: { studentId, sessionId },
    },
    include: {
      session: true,
      student: true,
      fellow: true,
      referredSupervisor: true,
    },
  });
  return event;
}

export async function createTriageEvent(
  data: TriageEventFormData,
  studentAttendanceId?: number,
): Promise<{ success: boolean; message: string; data?: TriageEventWithRelations }> {
  try {
    const { fellowId, hubId, userId } = await getFellowContext();
    const parsed = TriageEventSchema.parse(data);

    const session = await db.interventionSession.findUniqueOrThrow({
      where: { id: parsed.sessionId },
      select: { occurred: true, hubId: true },
    });
    if (!session.occurred) {
      return { success: false, message: "This session has not occurred yet." };
    }

    const existing = await db.triageEvent.findUnique({
      where: { studentId_sessionId: { studentId: parsed.studentId, sessionId: parsed.sessionId } },
    });
    if (existing) {
      return updateTriageEvent(
        { ...parsed, id: existing.id },
        studentAttendanceId ?? existing.studentAttendanceId ?? undefined,
      );
    }

    const effectiveHubId = hubId ?? session.hubId;

    const event = await db.$transaction(async (tx) => {
      const triageEvent = await tx.triageEvent.create({
        data: {
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
          metadata: { createdBy: userId } as Prisma.JsonObject,
        },
        include: {
          session: true,
          student: true,
          fellow: true,
          referredSupervisor: true,
        },
      });

      const shouldCreateClinicalCase =
        parsed.actionTaken === "REFERRED" || parsed.actionTaken === "ESCALATED";
      if (shouldCreateClinicalCase) {
        let currentSupervisorId: string | null = null;
        let clinicalLeadId: string | null = null;

        if (parsed.referredSupervisorId) {
          currentSupervisorId = parsed.referredSupervisorId;
        } else if (effectiveHubId) {
          const clinicalLead = await tx.clinicalLead.findFirst({
            where: { assignedHubId: effectiveHubId },
            select: { id: true },
          });
          if (clinicalLead) {
            clinicalLeadId = clinicalLead.id;
          }
        }

        const assigneeSupervisorId = currentSupervisorId ?? null;
        const assigneeClinicalLeadId = clinicalLeadId ?? null;
        const hasAssignee = assigneeSupervisorId !== null || assigneeClinicalLeadId !== null;

        const existingCase = hasAssignee
          ? await tx.clinicalScreeningInfo.findFirst({
              where:
                assigneeSupervisorId !== null
                  ? {
                      studentId: parsed.studentId,
                      currentSupervisorId: assigneeSupervisorId,
                    }
                  : {
                      studentId: parsed.studentId,
                      clinicalLeadId: assigneeClinicalLeadId ?? undefined,
                    },
            })
          : null;

        if (!existingCase) {
          const student = await tx.student.findUniqueOrThrow({
            where: { id: parsed.studentId },
            select: { schoolId: true },
          });
          const schoolId = student.schoolId;
          if (!schoolId) {
            throw new Error("Student has no school assigned; cannot create clinical case.");
          }
          const pseudonym = generateRandomPseudonym();

          await tx.clinicalScreeningInfo.create({
            data: {
              studentId: parsed.studentId,
              schoolId,
              currentSupervisorId,
              clinicalLeadId,
              initialReferredFrom: fellowId,
              initialReferredFromSpecified: "fellow",
              sessionWhenCaseIsFlaggedId: parsed.sessionId,
              pseudonym,
              flagged: false,
              riskStatus: parsed.riskScreenOutcome === "ANY_YES" ? "High" : "No",
              caseStatus: "Active",
            },
          });
        }
      }

      return triageEvent;
    });

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

    const existing = await db.triageEvent.findUniqueOrThrow({
      where: { id: data.id },
    });

    const beforeData = {
      riskScreenOutcome: existing.riskScreenOutcome,
      riskNotCompletedReason: existing.riskNotCompletedReason,
      actionTaken: existing.actionTaken,
      referredSupervisorId: existing.referredSupervisorId ?? undefined,
      supervisorHandoffStatus: existing.supervisorHandoffStatus,
      note: existing.note,
    } as Prisma.JsonObject;

    const event = await db.$transaction(async (tx) => {
      const updated = await tx.triageEvent.update({
        where: { id: data.id },
        data: {
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
            ...((existing.metadata as Prisma.JsonObject) ?? {}),
            lastEditedBy: userId,
          } as Prisma.JsonObject,
        },
        include: {
          session: true,
          student: true,
          fellow: true,
          referredSupervisor: true,
        },
      });

      await tx.triageEventAudit.create({
        data: {
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
          } as Prisma.JsonObject,
        },
      });

      return updated;
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
  const event = await db.triageEvent.findUnique({
    where: { studentId_sessionId: { studentId, sessionId } },
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
