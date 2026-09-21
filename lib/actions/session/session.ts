"use server";

import { and, eq } from "drizzle-orm";
import type { z } from "zod";

import { getCurrentPersonnel } from "#/app/auth";
import {
  MarkSessionOccurrenceSchema,
  RescheduleSessionSchema,
  ScheduleNewSessionSchema,
  SessionRatingsSchema,
} from "#/components/common/session/schema";
import { db } from "#/db/client";
import { ImplementerRole } from "#/db/enums";
import {
  interventionSession,
  interventionSessionRating,
  sessionComment,
  studentAttendance,
} from "#/db/schema";
import { requireAuthRole } from "#/lib/auth/require-auth-role";
import { objectId } from "#/lib/crypto";

async function checkAuth() {
  const personnel = await getCurrentPersonnel();
  const role = personnel?.session?.user.activeMembership?.role;
  if (
    !personnel ||
    (role !== ImplementerRole.HUB_COORDINATOR && role !== ImplementerRole.SUPERVISOR)
  ) {
    throw new Error("User not authenticated");
  }
  return personnel;
}

/** Same message Prisma's `findFirstOrThrow` produced; callers surface it to the user. */
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

/** Prisma's `update` failed when the row was gone; keep that behaviour. */
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
    await checkAuth();
    const parsedData = ScheduleNewSessionSchema.parse(data);
    const hubSessionType = await db.query.sessionName.findFirst({
      where: (s, { eq }) => eq(s.id, parsedData.sessionId),
      with: { hub: true },
    });

    if (!hubSessionType) {
      throw new Error("Session type not found.");
    }

    const { hub } = hubSessionType;
    if (hubSessionType.sessionType === "SUPERVISION" || hubSessionType.sessionType === "TRAINING") {
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
      // Prisma ignored an undefined schoolId in `where`; keep that.
      const schoolId = parsedData.schoolId;
      const existingSession = await db.query.interventionSession.findFirst({
        where: (s, { and, eq }) =>
          and(
            schoolId === undefined ? undefined : eq(s.schoolId, schoolId),
            eq(s.sessionId, parsedData.sessionId),
          ),
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
    const user = await checkAuth();
    const session = await findSessionWithSchoolOrThrow(id);

    if (
      user.session.user.activeMembership?.role === ImplementerRole.SUPERVISOR &&
      session.school?.assignedSupervisorId !== user.profile?.id
    ) {
      throw new Error(`You are not assigned to ${session.school?.schoolName}`);
    }

    await updateSessionOrThrow(id, { status: "Cancelled" });

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
    const user = await checkAuth();
    const parsedData = RescheduleSessionSchema.parse(data);

    const session = await findSessionWithSchoolOrThrow(id);

    if (
      user.session.user.activeMembership?.role === ImplementerRole.SUPERVISOR &&
      session.school?.assignedSupervisorId !== user.profile?.id
    ) {
      throw new Error(`You are not assigned to ${session.school?.schoolName}`);
    }

    await updateSessionOrThrow(id, { sessionDate: parsedData.sessionDate, status: "Rescheduled" });

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
    const user = await checkAuth();
    if (!user?.session.user.id) {
      return { success: false, message: "User not found" };
    }

    const role = user.session.user.activeMembership?.role;
    if (role !== ImplementerRole.SUPERVISOR) {
      throw new Error("User not authorized to perform this action");
    }

    await db.insert(sessionComment).values({
      sessionId,
      content: notes,
      userId: user.session.user.id,
    });
    return { success: true, message: "Notes submitted successfully" };
  } catch (error) {
    console.error(error);
    return { success: false, message: "Something went wrong" };
  }
}

export async function submitSessionRatings(data: z.infer<typeof SessionRatingsSchema>) {
  try {
    const user = await checkAuth();
    if (!user?.session.user.id) {
      return { success: false, message: "User not found" };
    }

    const role = user.session.user.activeMembership?.role;
    if (role !== ImplementerRole.SUPERVISOR) {
      throw new Error("User not authorized to perform this action");
    }

    if (!user.profile?.id) {
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

    if (session.school?.assignedSupervisorId !== user.profile?.id) {
      throw new Error(`You are not assigned to ${session.school?.schoolName}`);
    }

    const rating = {
      sessionId,
      supervisorId: user.profile.id,
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
    const user = await checkAuth();
    if (!user?.session.user.id) {
      return { success: false, message: "User not found" };
    }

    const role = user.session.user.activeMembership?.role;
    if (!user.profile?.id) {
      return {
        success: false,
        message:
          role === ImplementerRole.SUPERVISOR
            ? "Supervisor not found"
            : "Hub coordinator not found",
      };
    }

    const parsedData = MarkSessionOccurrenceSchema.parse(data);

    const session = await findSessionWithSchoolOrThrow(parsedData.sessionId);

    if (session.sessionDate > new Date()) {
      throw new Error("This session's date has not arrived yet. Please check the date and time.");
    }

    const schoolSessionTypes = ["INTERVENTION", "DATA_COLLECTION", "CLINICAL"];
    const venueSessionTypes = ["SUPERVISION", "TRAINING"];
    if (
      session.session &&
      schoolSessionTypes.includes(session.session?.sessionType) &&
      session.school?.assignedSupervisorId !== user.profile?.id &&
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

export async function fetchSessionAttendances(sessionId: string) {
  await requireAuthRole(
    ImplementerRole.FELLOW,
    ImplementerRole.SUPERVISOR,
    ImplementerRole.HUB_COORDINATOR,
    ImplementerRole.ADMIN,
  );
  return db.query.studentAttendance.findMany({
    where: (a, { eq }) => eq(a.sessionId, sessionId),
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
  const { role, identifier } = await requireAuthRole(
    ImplementerRole.FELLOW,
    ImplementerRole.SUPERVISOR,
    ImplementerRole.HUB_COORDINATOR,
    ImplementerRole.ADMIN,
  );
  if (role === ImplementerRole.FELLOW && identifier !== fellowId) {
    throw new Error("Unauthorized: fellows may only count their own group attendance");
  }
  return db.$count(
    studentAttendance,
    and(eq(studentAttendance.sessionId, sessionId), eq(studentAttendance.fellowId, fellowId)),
  );
}
