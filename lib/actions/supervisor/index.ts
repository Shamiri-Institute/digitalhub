"use server";

import { eq } from "drizzle-orm";
import type { z } from "zod";

import { MarkAttendanceSchema } from "#/app/(platform)/hc/schemas";
import { currentHubCoordinator } from "#/app/auth";
import { db } from "#/db/client";
import { supervisorAttendance } from "#/db/schema";

async function checkAuth() {
  const hubCoordinator = await currentHubCoordinator();

  if (!hubCoordinator) {
    throw new Error("The session has not been authenticated");
  }

  return hubCoordinator;
}

async function requireSession(sessionId: string) {
  const session = await db.query.interventionSession.findFirst({
    where: (s, { eq }) => eq(s.id, sessionId),
  });
  if (!session) {
    throw new Error(`Intervention session ${sessionId} not found`);
  }
  return session;
}

export async function markSupervisorAttendance(data: z.infer<typeof MarkAttendanceSchema>) {
  try {
    const auth = await checkAuth();
    const userId = auth.session.user.id;
    if (!userId) {
      throw new Error("The session has not been authenticated");
    }

    const { id, sessionId, absenceReason, attended, comments } = MarkAttendanceSchema.parse(data);
    if (!id) {
      throw new Error("Supervisor id is required");
    }
    const supervisor = await db.query.supervisor.findFirst({ where: (s, { eq }) => eq(s.id, id) });
    if (!supervisor) {
      throw new Error(`Supervisor ${id} not found`);
    }

    const attendance = await db.query.supervisorAttendance.findFirst({
      where: (a, { and, eq }) => and(eq(a.supervisorId, id), eq(a.sessionId, sessionId)),
    });

    if (attendance) {
      const attendanceStatus =
        attended === "attended" ? true : attended === "missed" ? false : null;
      await db
        .update(supervisorAttendance)
        .set({
          markedBy: userId,
          supervisorId: id,
          absenceReason: attendanceStatus === false ? absenceReason : null,
          absenceComments: attendanceStatus === false ? comments : null,
          attended: attended === "attended" ? true : attended === "missed" ? false : null,
        })
        .where(eq(supervisorAttendance.id, attendance.id));
      return {
        success: true,
        message: `Successfully updated attendance for ${supervisor.supervisorName}`,
      };
    }
    const session = await requireSession(sessionId);

    const projectId = session.projectId;
    if (!projectId) {
      throw new Error(
        "Session has no project. Ensure the session is linked to a hub with a project.",
      );
    }

    await db.insert(supervisorAttendance).values({
      supervisorId: id,
      schoolId: session.schoolId ?? undefined,
      projectId,
      sessionId,
      absenceReason,
      absenceComments: comments,
      markedBy: userId,
      attended: attended === "attended" ? true : attended === "missed" ? false : null,
    });
    return {
      success: true,
      message: `Successfully marked attendance for ${supervisor.supervisorName}`,
    };
  } catch (err) {
    console.error(err);
    return {
      success: false,
      message: (err as Error)?.message ?? "Sorry, could not mark supervisor attendance.",
    };
  }
}

export async function markManySupervisorAttendance(
  ids: string[],
  data: z.infer<typeof MarkAttendanceSchema>,
) {
  const auth = await checkAuth();
  const userId = auth.session.user.id;
  if (!userId) {
    throw new Error("The session has not been authenticated");
  }

  const { sessionId, absenceReason, attended, comments } = MarkAttendanceSchema.parse(data);

  const session = await requireSession(sessionId);

  const projectId = session.projectId;
  if (!projectId) {
    throw new Error(
      "Session has no project. Ensure the session is linked to a hub with a project.",
    );
  }

  return await Promise.all(
    ids.map(async (supervisorId) => {
      const attendance = await db.query.supervisorAttendance.findFirst({
        where: (a, { and, eq }) =>
          and(eq(a.supervisorId, supervisorId), eq(a.sessionId, sessionId)),
      });

      const attendanceStatus =
        attended === "attended" ? true : attended === "missed" ? false : null;
      if (attendance) {
        await db
          .update(supervisorAttendance)
          .set({
            markedBy: userId,
            supervisorId,
            absenceReason: attendanceStatus === false ? absenceReason : null,
            absenceComments: attendanceStatus === false ? comments : null,
            attended: attendanceStatus,
          })
          .where(eq(supervisorAttendance.id, attendance.id));
      } else {
        await db.insert(supervisorAttendance).values({
          supervisorId,
          schoolId: session.schoolId,
          projectId,
          absenceReason,
          absenceComments: comments,
          sessionId,
          markedBy: userId,
          attended: attended === "attended" ? true : attended === "missed" ? false : null,
        });
      }
      return;
    }),
  )
    .then(() => {
      return {
        success: true,
        message: `Successfully marked attendances for ${ids.length} supervisors.`,
      };
    })
    .catch((error: unknown) => {
      console.error(error);
      return {
        success: false,
        message: "Something went wrong while updating supervisor attendance",
      };
    });
}
