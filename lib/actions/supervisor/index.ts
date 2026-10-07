"use server";

import { and, eq, inArray, sql } from "drizzle-orm";
import { refresh } from "next/cache";
import type { z } from "zod";

import { MarkAttendanceSchema } from "#/app/(platform)/hc/schemas";
import { db } from "#/db/client";
import { ImplementerRole } from "#/db/enums";
import { supervisor, supervisorAttendance } from "#/db/schema";
import { hubOfSession, requireHubRole } from "#/lib/auth/require-hub-role";

async function upsertSupervisorAttendances(
  supervisorIds: string[],
  data: z.infer<typeof MarkAttendanceSchema>,
) {
  const coordinator = await requireHubRole(ImplementerRole.HUB_COORDINATOR);
  const { sessionId, absenceReason, attended, comments } = MarkAttendanceSchema.parse(data);
  const uniqueSupervisorIds = [...new Set(supervisorIds)];

  const [session, supervisorsInHub] = await Promise.all([
    db.query.interventionSession.findFirst({
      where: (s, { eq }) => eq(s.id, sessionId),
      columns: { projectId: true, schoolId: true, hubId: true },
      with: { school: { columns: { hubId: true } } },
    }),
    uniqueSupervisorIds.length === 0
      ? []
      : db
          .select({ id: supervisor.id, supervisorName: supervisor.supervisorName })
          .from(supervisor)
          .where(
            and(
              inArray(supervisor.id, uniqueSupervisorIds),
              eq(supervisor.hubId, coordinator.hubId),
            ),
          ),
  ]);
  if (!session || hubOfSession(session) !== coordinator.hubId) {
    throw new Error(`Intervention session ${sessionId} not found`);
  }
  const { projectId, schoolId } = session;
  if (!projectId) {
    throw new Error(
      "Session has no project. Ensure the session is linked to a hub with a project.",
    );
  }
  if (supervisorsInHub.length !== uniqueSupervisorIds.length) {
    throw new Error("Supervisor not found in your hub");
  }

  const attendanceStatus = attended === "attended" ? true : attended === "missed" ? false : null;
  const markedFields = {
    markedBy: coordinator.userId,
    attended: attendanceStatus,
    absenceReason: attendanceStatus === false ? absenceReason : null,
    absenceComments: attendanceStatus === false ? comments : null,
  };
  if (uniqueSupervisorIds.length > 0) {
    await db
      .insert(supervisorAttendance)
      .values(
        uniqueSupervisorIds.map((supervisorId) => ({
          ...markedFields,
          supervisorId,
          sessionId,
          projectId,
          schoolId,
        })),
      )
      .onConflictDoUpdate({
        target: [supervisorAttendance.supervisorId, supervisorAttendance.sessionId],
        set: {
          markedBy: sql`excluded.marked_by`,
          attended: sql`excluded.attended`,
          absenceReason: sql`excluded.absence_reason`,
          absenceComments: sql`excluded.absence_comments`,
          updatedAt: new Date(),
        },
      });
  }
  return supervisorsInHub;
}

export async function markSupervisorAttendance(data: z.infer<typeof MarkAttendanceSchema>) {
  try {
    if (!data.id) {
      throw new Error("Supervisor id is required");
    }
    const [marked] = await upsertSupervisorAttendances([data.id], data);
    refresh();
    return {
      success: true,
      message: `Successfully marked attendance for ${marked?.supervisorName}`,
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
  try {
    await upsertSupervisorAttendances(ids, data);
    refresh();
    return {
      success: true,
      message: `Successfully marked attendances for ${ids.length} supervisors.`,
    };
  } catch (error) {
    console.error(error);
    return {
      success: false,
      message: "Something went wrong while updating supervisor attendance",
    };
  }
}
