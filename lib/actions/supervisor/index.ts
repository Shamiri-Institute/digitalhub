"use server";

import { MarkAttendanceSchema } from "#/app/(platform)/hc/schemas";
import { currentHubCoordinator, getCurrentUser } from "#/app/auth";
import { CURRENT_PROJECT_ID } from "#/lib/constants";
import { db } from "#/lib/db";
import { z } from "zod";

async function checkAuth() {
  const hubCoordinator = await currentHubCoordinator();

  if (!hubCoordinator) {
    throw new Error("The session has not been authenticated");
  }

  const user = await getCurrentUser();
  return { hubCoordinator, user };
}

export async function markSupervisorAttendance(
  data: z.infer<typeof MarkAttendanceSchema>,
) {
  try {
    const auth = await checkAuth();

    const { id, sessionId, absenceReason, attended, comments } =
      MarkAttendanceSchema.parse(data);
    const supervisor = await db.supervisor.findUniqueOrThrow({
      where: {
        id,
      },
    });

    if (supervisor) {
      const attendance = await db.supervisorAttendance.findFirst({
        where: {
          supervisorId: id,
          sessionId,
        },
      });

      if (attendance) {
        const attendanceStatus =
          attended === "attended" ? true : attended === "missed" ? false : null;
        await db.supervisorAttendance.update({
          where: {
            id: attendance.id,
          },
          data: {
            markedBy: auth.user!.user.id,
            supervisorId: id,
            absenceReason: attendanceStatus === false ? absenceReason : null,
            absenceComments: attendanceStatus === false ? comments : null,
            attended:
              attended === "attended"
                ? true
                : attended === "missed"
                  ? false
                  : null,
          },
        });
        return {
          success: true,
          message: `Successfully updated attendance for ${supervisor.supervisorName}`,
        };
      } else {
        const session = await db.interventionSession.findFirstOrThrow({
          where: {
            id: sessionId,
          },
        });
        await db.supervisorAttendance.create({
          data: {
            supervisorId: id!,
            schoolId: session.schoolId ?? undefined,
            projectId: session.projectId ?? CURRENT_PROJECT_ID,
            sessionId,
            absenceReason,
            absenceComments: comments,
            markedBy: auth.user!.user.id,
            attended:
              attended === "attended"
                ? true
                : attended === "missed"
                  ? false
                  : null,
          },
        });
        return {
          success: true,
          message: `Successfully marked attendance for ${supervisor.supervisorName}`,
        };
      }
    } else {
      return {
        success: false,
        message: `Supervisor details not found.`,
      };
    }
  } catch (err) {
    console.error(err);
    return {
      success: false,
      message:
        (err as Error)?.message ??
        "Sorry, could not mark supervisor attendance.",
    };
  }
}

export async function markManySupervisorAttendance(
  ids: string[],
  data: z.infer<typeof MarkAttendanceSchema>,
) {
  const auth = await checkAuth();

  const { sessionId, absenceReason, attended, comments } =
    MarkAttendanceSchema.parse(data);

  const session = await db.interventionSession.findFirstOrThrow({
    where: {
      id: sessionId,
    },
  });

  return await Promise.all(
    ids.map(async (supervisorId) => {
      const attendance = await db.supervisorAttendance.findFirst({
        where: {
          supervisorId,
          sessionId,
        },
      });

      const attendanceStatus =
        attended === "attended" ? true : attended === "missed" ? false : null;
      if (attendance) {
        await db.supervisorAttendance.update({
          where: {
            id: attendance.id,
          },
          data: {
            markedBy: auth.user!.user.id,
            supervisorId,
            absenceReason: attendanceStatus === false ? absenceReason : null,
            absenceComments: attendanceStatus === false ? comments : null,
            attended: attendanceStatus,
          },
        });
      } else {
        await db.supervisorAttendance.create({
          data: {
            supervisorId,
            schoolId: session.schoolId,
            projectId: session.projectId ?? CURRENT_PROJECT_ID,
            absenceReason,
            absenceComments: comments,
            sessionId,
            markedBy: auth.user!.user.id,
            attended:
              attended === "attended"
                ? true
                : attended === "missed"
                  ? false
                  : null,
          },
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
