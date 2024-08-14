"use server";

import {
  EditSupervisorSchema,
  MarkSupervisorAttendanceSchema,
} from "#/app/(platform)/hc/schemas";
import { currentHubCoordinator, getCurrentUser } from "#/app/auth";
import { db } from "#/lib/db";
import { z } from "zod";

async function checkAuth() {
  const hubCoordinator = await currentHubCoordinator();
  const user = await getCurrentUser();

  if (!hubCoordinator || !user) {
    throw new Error("The session has not been authenticated");
  }
}

export async function dropoutSupervisor(
  supervisorId: string,
  dropoutReason: string,
) {
  try {
    await checkAuth();

    const data = EditSupervisorSchema.parse({ supervisorId, dropoutReason });
    const result = await db.supervisor.update({
      data: {
        // TODO: add columns for drop-out details. Confirm with @Wendy
        // dropoutReason: data.dropoutReason,
        // droppedOutAt: new Date(),
        droppedOut: true,
      },
      where: {
        id: data.supervisorId,
      },
    });

    return {
      success: true,
      message: result.supervisorName + " successfully dropped out.",
      data: result,
    };
  } catch (e) {
    console.error(e);
    return {
      success: false,
      message: "Something went wrong while trying to drop out the school",
    };
  }
}

export async function undropSupervisor(supervisorId: string) {
  try {
    await checkAuth();
    const result = await db.supervisor.update({
      data: {
        // TODO: add columns for drop-out details. Confirm with @Wendy
        // dropoutReason: null,
        // droppedOutAt: null,
        droppedOut: false,
      },
      where: {
        id: supervisorId,
      },
    });

    return {
      success: true,
      message: result.supervisorName + " successfully un-dropped.",
      data: result,
    };
  } catch (e) {
    console.error(e);
    return {
      success: false,
      message: "Something went wrong while trying to drop out the school",
    };
  }
}

export async function getSessionAndSupervisorAttendances({
  projectId,
  supervisorId,
  schoolId,
}: {
  projectId: string;
  supervisorId: string;
  schoolId: string;
}) {
  try {
    const data = await db.interventionSession.findMany({
      where: {
        schoolId,
        projectId,
        occurred: true,
      },
      include: {
        supervisorAttendances: {
          where: {
            supervisorId,
          },
        },
      },
      orderBy: {
        sessionDate: "asc",
      },
    });
    return {
      success: true,
      message: "Successfully fetched supervisor attendances.",
      data,
    };
  } catch (error: unknown) {
    console.error(error);
    return { error: "Something went wrong while scheduling a new session" };
  }
}

export async function markSupervisorAttendance(
  id: string,
  data: z.infer<typeof MarkSupervisorAttendanceSchema>,
) {
  const user = getCurrentUser();
  if (user === null)
    return { success: false, message: "Unauthenticated user." };

  const parsedData = MarkSupervisorAttendanceSchema.parse(data);
  const attended =
    parsedData.attended === "attended"
      ? true
      : parsedData.attended === "missed"
        ? false
        : null;
  try {
    const attendance = await db.supervisorAttendance.findFirst({
      where: { id },
    });

    if (attendance !== null) {
      await db.supervisorAttendance.update({
        where: {
          id: attendance.id,
        },
        data: {
          attended,
          absenceReason: !attended ? parsedData.absenceReason : null,
          absenceComments: !attended ? parsedData.comments : null,
        },
      });
      return {
        success: true,
        message: "Successfully marked supervisor attendance.",
        data: attendance,
      };
    } else {
      return {
        error: "Something went wrong while updating supervisor attendance",
      };
    }
  } catch (error: unknown) {
    console.error(error);
    return {
      error: "Something went wrong while updating supervisor attendance",
    };
  }
}

export async function markBatchSupervisorAttendance(
  sessionId: string,
  supervisors: string[],
  attended: boolean | null,
) {
  const user = getCurrentUser();
  if (user === null)
    return { success: false, message: "Unauthenticated user." };
  try {
    await db.supervisorAttendance.updateMany({
      where: {
        sessionId,
        supervisorId: {
          in: supervisors,
        },
      },
      data: {
        attended,
      },
    });
    return {
      success: true,
      message: "Successfully marked supervisor attendance.",
      // data: attendance,
    };
  } catch (error: unknown) {
    console.error(error);
    return {
      error: "Something went wrong while updating supervisor attendance",
    };
  }
}

export async function updateSupervisorDetails(
  data: z.infer<typeof EditSupervisorSchema>,
) {
  try {
    const authedCoordinator = await currentHubCoordinator();

    if (!authedCoordinator) {
      throw new Error("User not authorised to perform this function");
    }

    const {
      supervisorId,
      supervisorEmail,
      supervisorName,
      county,
      subCounty,
      cellNumber,
      mpesaName,
      mpesaNumber,
      gender,
      idNumber,
    } = EditSupervisorSchema.parse(data);

    await db.supervisor.update({
      where: {
        id: supervisorId,
      },
      data: {
        supervisorName,
        supervisorEmail,
        county,
        subCounty,
        cellNumber,
        mpesaName,
        mpesaNumber,
        gender,
        idNumber,
      },
    });
    return {
      success: true,
      message: `Successfully updated details for ${supervisorName}`,
    };
  } catch (err) {
    console.error(err);
    return {
      success: false,
      message:
        (err as Error)?.message ??
        "Sorry, could not update supervisor details.",
    };
  }
}
