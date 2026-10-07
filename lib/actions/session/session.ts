"use server";

import { and, eq } from "drizzle-orm";
import { refresh, revalidatePath } from "next/cache";
import type { z } from "zod";

import {
  MarkSessionOccurrenceSchema,
  RescheduleSessionSchema,
  ScheduleNewSessionSchema,
  SessionRatingsSchema,
} from "#/components/common/session/schema";
import { db } from "#/db/client";
import { ImplementerRole } from "#/db/enums";
import {
  interventionGroup,
  interventionSession,
  interventionSessionRating,
  sessionComment,
  student,
  studentAttendance,
} from "#/db/schema";
import { requireAuthRole } from "#/lib/auth/require-auth-role";
import { requireHubRole, requireSchoolInHub } from "#/lib/auth/require-hub-role";
import { objectId } from "#/lib/crypto";

function requireHubCoordinatorOrSupervisor() {
  return requireHubRole(ImplementerRole.HUB_COORDINATOR, ImplementerRole.SUPERVISOR);
}

async function findSessionWithSchoolOrThrow(id: string) {
  const session = await db.query.interventionSession.findFirst({
    where: (s, { eq }) => eq(s.id, id),
    with: { school: true, session: true },
  });
  if (!session) {
    throw new Error("No InterventionSession found");
  }
  return session;
}

/**
 * Throws unless the session belongs to the caller's hub, the only sessions their schedule lists.
 * A session in another hub gets the same message as a missing one.
 */
function requireSessionInCallerHub(
  session: { hubId: string | null; school: { hubId: string | null } | null },
  callerHubId: string,
) {
  const sessionHubId = session.hubId ?? session.school?.hubId;
  if (sessionHubId !== callerHubId) {
    throw new Error("No InterventionSession found");
  }
}

async function updateSessionOrThrow(
  id: string,
  values: Partial<typeof interventionSession.$inferInsert>,
) {
  const updated = await db
    .update(interventionSession)
    .set(values)
    .where(eq(interventionSession.id, id))
    .returning({ id: interventionSession.id });
  if (updated.length === 0) {
    throw new Error("Record to update not found.");
  }
}

export async function createNewSession(data: z.infer<typeof ScheduleNewSessionSchema>) {
  try {
    const { hubId: callerHubId } = await requireHubCoordinatorOrSupervisor();
    const parsedData = ScheduleNewSessionSchema.parse(data);
    const hubSessionType = await db.query.sessionName.findFirst({
      where: (s, { eq }) => eq(s.id, parsedData.sessionId),
      with: { hub: true },
    });

    if (!hubSessionType) {
      throw new Error("Session type not found.");
    }

    const { hub } = hubSessionType;
    if (hub.id !== callerHubId) {
      throw new Error("Session type not found.");
    }
    if (parsedData.schoolId) {
      await requireSchoolInHub(parsedData.schoolId, callerHubId);
    }
    if (
      hubSessionType.sessionType === "SUPERVISION" ||
      hubSessionType.sessionType === "TRAINING" ||
      hubSessionType.sessionType === "SPECIAL"
    ) {
      const existingSession = await db.query.interventionSession.findFirst({
        where: (s, { and, eq }) => and(eq(s.hubId, hub.id), eq(s.sessionId, parsedData.sessionId)),
      });
      if (existingSession) {
        console.error(`This session already exists for hub ${hub.hubName}`);
        return {
          success: false,
          data: existingSession,
          message: "This session already exists for this hub",
        };
      }
    } else {
      const { schoolId } = parsedData;
      if (!schoolId) {
        throw new Error("A school is required for this session type.");
      }
      const existingSession = await db.query.interventionSession.findFirst({
        where: (s, { and, eq }) =>
          and(eq(s.schoolId, schoolId), eq(s.sessionId, parsedData.sessionId)),
        with: { school: true },
      });
      if (existingSession) {
        console.error(`This session already exists for ${existingSession?.school?.schoolName}`);
        return {
          success: false,
          data: existingSession,
          message: `This session already exists for ${existingSession?.school?.schoolName}`,
        };
      }
    }
    await db.insert(interventionSession).values({
      id: objectId("isess"),
      sessionId: parsedData.sessionId,
      sessionDate: parsedData.sessionDate,
      yearOfImplementation: parsedData.sessionDate.getFullYear() || new Date().getFullYear(),
      schoolId: parsedData.schoolId !== "" ? parsedData.schoolId : undefined,
      occurred: false,
      projectId: hubSessionType.hub.projectId,
      hubId: hub.id,
      venue: parsedData.venue,
    });
    refresh();

    return {
      success: true,
      message: "Successfully scheduled new session.",
    };
  } catch (error: unknown) {
    console.error(error);
    return {
      success: false,
      message: "Something went wrong while scheduling a new session",
    };
  }
}

export async function cancelSession(id: string) {
  try {
    const caller = await requireHubCoordinatorOrSupervisor();
    const session = await findSessionWithSchoolOrThrow(id);
    requireSessionInCallerHub(session, caller.hubId);

    if (
      caller.role === ImplementerRole.SUPERVISOR &&
      session.school?.assignedSupervisorId !== caller.profileId
    ) {
      throw new Error(`You are not assigned to ${session.school?.schoolName}`);
    }

    await updateSessionOrThrow(id, { status: "Cancelled" });
    refresh();

    return {
      success: true,
      message: "Successfully cancelled session.",
    };
  } catch (error: unknown) {
    console.error(error);
    return {
      success: false,
      message: (error as Error)?.message ?? "An error occurred while marking attendance.",
    };
  }
}

export async function rescheduleSession(id: string, data: z.infer<typeof RescheduleSessionSchema>) {
  try {
    const caller = await requireHubCoordinatorOrSupervisor();
    const parsedData = RescheduleSessionSchema.parse(data);

    const session = await findSessionWithSchoolOrThrow(id);
    requireSessionInCallerHub(session, caller.hubId);

    if (
      caller.role === ImplementerRole.SUPERVISOR &&
      session.school?.assignedSupervisorId !== caller.profileId
    ) {
      throw new Error(`You are not assigned to ${session.school?.schoolName}`);
    }

    await updateSessionOrThrow(id, { sessionDate: parsedData.sessionDate, status: "Rescheduled" });
    refresh();

    return {
      success: true,
      message: "Successfully rescheduled session.",
    };
  } catch (error: unknown) {
    console.error(error);
    return {
      success: false,
      message: (error as Error)?.message ?? "An error occurred while marking attendance.",
    };
  }
}

export async function submitQualitativeFeedback({
  notes,
  sessionId,
}: {
  notes: string;
  sessionId: string;
}) {
  try {
    const { userId, hubId } = await requireHubRole(ImplementerRole.SUPERVISOR);
    requireSessionInCallerHub(await findSessionWithSchoolOrThrow(sessionId), hubId);

    await db.insert(sessionComment).values({
      sessionId,
      content: notes,
      userId,
    });
    revalidatePath("/sc/reporting/school-reports/session");
    return { success: true, message: "Notes submitted successfully" };
  } catch (error) {
    console.error(error);
    return { success: false, message: "Something went wrong" };
  }
}

export async function submitSessionRatings(data: z.infer<typeof SessionRatingsSchema>) {
  try {
    const { identifier: supervisorId } = await requireAuthRole(ImplementerRole.SUPERVISOR);
    if (!supervisorId) {
      return { success: false, message: "Supervisor not found" };
    }

    const {
      studentBehaviorRating,
      workloadRating,
      adminSupportRating,
      positiveHighlights,
      challenges,
      recommendations,
      sessionId,
      headcount,
    } = SessionRatingsSchema.parse(data);

    const session = await findSessionWithSchoolOrThrow(sessionId);

    if (session.school?.assignedSupervisorId !== supervisorId) {
      throw new Error(`You are not assigned to ${session.school?.schoolName}`);
    }

    const rating = {
      sessionId,
      supervisorId,
      studentBehaviorRating,
      workloadRating,
      adminSupportRating,
      positiveHighlights,
      challenges,
      recommendations,
      headcount,
    };
    await db
      .insert(interventionSessionRating)
      .values({ id: objectId("isr"), ...rating })
      .onConflictDoUpdate({
        target: [interventionSessionRating.sessionId, interventionSessionRating.supervisorId],
        set: { ...rating, updatedAt: new Date() },
      });
    refresh();

    return {
      success: true,
      message: "Successfully submitted session ratings.",
    };
  } catch (error: unknown) {
    console.error(error);
    return {
      success: false,
      message: (error as Error)?.message ?? "An error occurred while submitting session ratings.",
    };
  }
}

export async function markSessionOccurrence(data: z.infer<typeof MarkSessionOccurrenceSchema>) {
  try {
    const { role, profileId, hubId } = await requireHubCoordinatorOrSupervisor();
    const parsedData = MarkSessionOccurrenceSchema.parse(data);

    const session = await findSessionWithSchoolOrThrow(parsedData.sessionId);
    requireSessionInCallerHub(session, hubId);

    if (session.sessionDate > new Date()) {
      throw new Error("This session's date has not arrived yet. Please check the date and time.");
    }

    const schoolSessionTypes = ["INTERVENTION", "DATA_COLLECTION", "CLINICAL"];
    const venueSessionTypes = ["SUPERVISION", "TRAINING"];
    if (
      session.session &&
      schoolSessionTypes.includes(session.session?.sessionType) &&
      session.school?.assignedSupervisorId !== profileId &&
      role === ImplementerRole.SUPERVISOR
    ) {
      throw new Error(
        `Something went wrong. You are not assigned to ${session.school?.schoolName}`,
      );
    }
    if (
      session.session &&
      venueSessionTypes.includes(session.session?.sessionType) &&
      role === ImplementerRole.SUPERVISOR
    ) {
      throw new Error("Something went wrong. You are not authorized to perform this action.");
    }
    if (!session.session) {
      throw new Error(
        `Something went wrong. Session details not found ${session.school?.schoolName}`,
      );
    }

    await updateSessionOrThrow(parsedData.sessionId, {
      occurred: parsedData.occurrence === "attended",
    });
    refresh();

    return {
      success: true,
      message: "Successfully updated session occurrence",
    };
  } catch (error: unknown) {
    console.error(error);
    return {
      success: false,
      message: (error as Error)?.message ?? "An error occurred while marking attendance.",
    };
  }
}

/**
 * Throws unless the caller may see the session: an admin of the implementer that runs its hub, a
 * supervisor or hub coordinator of its hub, or a fellow who leads a group at its school.
 */
async function requireSessionVisibleToCaller(sessionId: string) {
  const membership = await requireAuthRole(
    ImplementerRole.FELLOW,
    ImplementerRole.SUPERVISOR,
    ImplementerRole.HUB_COORDINATOR,
    ImplementerRole.ADMIN,
  );
  const session = await findSessionWithSchoolOrThrow(sessionId);
  const sessionHubId = session.hubId ?? session.school?.hubId ?? null;
  if (membership.role === ImplementerRole.ADMIN) {
    const sessionHub = sessionHubId
      ? await db.query.hub.findFirst({
          where: (h, { eq }) => eq(h.id, sessionHubId),
          columns: { implementerId: true },
        })
      : undefined;
    if (sessionHub?.implementerId !== membership.implementerId) {
      throw new Error("No InterventionSession found");
    }
    return { membership, fellowId: undefined };
  }
  if (membership.role === ImplementerRole.FELLOW) {
    const fellowId = membership.identifier;
    const ledGroup =
      fellowId && session.schoolId
        ? await db.query.interventionGroup.findFirst({
            where: (g, { and, eq }) =>
              and(eq(g.schoolId, session.schoolId ?? ""), eq(g.leaderId, fellowId)),
            columns: { id: true },
          })
        : undefined;
    if (!fellowId || !ledGroup) {
      throw new Error("No InterventionSession found");
    }
    return { membership, fellowId };
  }
  const { hubId } = await requireHubCoordinatorOrSupervisor();
  requireSessionInCallerHub(session, hubId);
  return { membership, fellowId: undefined };
}

export async function fetchSessionAttendances(sessionId: string) {
  const { fellowId } = await requireSessionVisibleToCaller(sessionId);
  return db.query.studentAttendance.findMany({
    where: (a, { and, eq, inArray }) =>
      and(
        eq(a.sessionId, sessionId),
        fellowId
          ? inArray(
              a.studentId,
              db
                .select({ id: student.id })
                .from(student)
                .innerJoin(interventionGroup, eq(interventionGroup.id, student.assignedGroupId))
                .where(eq(interventionGroup.leaderId, fellowId)),
            )
          : undefined,
      ),
    columns: {
      id: true,
      studentId: true,
      attended: true,
      absenceReason: true,
      comments: true,
      sessionId: true,
      schoolId: true,
    },
  });
}

export async function countSessionGroupAttendance(sessionId: string, fellowId: string) {
  const { membership } = await requireSessionVisibleToCaller(sessionId);
  if (membership.role === ImplementerRole.FELLOW && membership.identifier !== fellowId) {
    throw new Error("Unauthorized: fellows may only count their own group attendance");
  }
  return db.$count(
    studentAttendance,
    and(eq(studentAttendance.sessionId, sessionId), eq(studentAttendance.fellowId, fellowId)),
  );
}
