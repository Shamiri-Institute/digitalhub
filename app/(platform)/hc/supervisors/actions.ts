"use server";

import {
  AddNewSupervisorSchema,
  DropoutSupervisorSchema,
  EditSupervisorSchema,
  MarkSupervisorAttendanceSchema,
  SubmitComplaintSchema,
  WeeklyHubTeamMeetingSchema,
} from "#/app/(platform)/hc/schemas";
import { currentHubCoordinator, getCurrentUser } from "#/app/auth";
import { db } from "#/lib/db";

import { CURRENT_PROJECT_ID } from "#/lib/constants";
import { objectId } from "#/lib/crypto";
import { z } from "zod";

async function generateSupervisorVisibleId() {
  const hc = await currentHubCoordinator();

  if (!hc) {
    throw new Error("The session has not been authenticated");
  }

  if (!hc.assignedHub) {
    throw new Error("Hub coordinator has no assigned hub");
  }

  const supervisorCount = await db.supervisor.count({
    where: {
      hubId: hc.assignedHubId,
    },
  });

  const hubPrefix = hc.assignedHub.visibleId.split("_")[0];
  const supervisorIndex: number = supervisorCount + 1;
  return "SPV" + hubPrefix + supervisorIndex;
}

export async function submitWeeklyTeamMeeting(
  data: z.infer<typeof WeeklyHubTeamMeetingSchema>,
) {
  try {
    const parsedData = WeeklyHubTeamMeetingSchema.parse(data);

    await db.weeklyTeamMeetingReport.create({
      data: parsedData,
    });
    //TODO: If there will be a view for the weekly report, we should add a revalidation here
    return {
      success: true,
      message: "Successfully submitted the weekly team meeting report",
    };
  } catch (e) {
    console.error(e);
    return {
      success: false,
      message: "Something went wrong. Please try again",
    };
  }
}

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

    const data = DropoutSupervisorSchema.parse({ supervisorId, dropoutReason });
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
      message: "Something went wrong while trying to drop out the supervisor",
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

export async function submitSupervisorComplaint(
  data: z.infer<typeof SubmitComplaintSchema>,
) {
  try {
    const hubCoordinator = await currentHubCoordinator();
    const user = await getCurrentUser();

    if (!hubCoordinator || !user) {
      throw new Error("The session has not been authenticated");
    }

    const parsedData = SubmitComplaintSchema.parse(data);
    console.log(parsedData);
    const result = await db.supervisorComplaints.create({
      data: {
        supervisorId: parsedData.supervisorId,
        complaint: parsedData.complaint,
        comments: parsedData.comments,
        hubCoordinatorId: hubCoordinator.id,
        projectId: CURRENT_PROJECT_ID,
      },
    });

    return {
      success: true,
      message: "Complaint submitted successfully.",
      data: result,
    };
  } catch (e) {
    console.error(e);
    return {
      success: false,
      message: "Something went wrong while trying to submit a complaint",
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
  await checkAuth();

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
  await checkAuth();

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
        absenceReason: null,
        absenceComments: null,
      },
    });
    return {
      success: true,
      message: "Successfully marked supervisor attendance.",
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
    await checkAuth();

    const {
      supervisorId,
      personalEmail,
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
        personalEmail,
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

export async function createNewSupervisor(
  data: z.infer<typeof AddNewSupervisorSchema>,
) {
  try {
    const hc = await currentHubCoordinator();
    const user = await getCurrentUser();

    if (!hc || !user) {
      throw new Error("The session has not been authenticated");
    }

    if (!hc.assignedHub) {
      throw new Error("Hub coordinator has no assigned hub");
    }

    const parsedData = AddNewSupervisorSchema.parse(data);

    const result = await db.supervisor.create({
      data: {
        ...parsedData,
        id: objectId("sup"),
        visibleId: await generateSupervisorVisibleId(),
        implementerId: hc.assignedHub.implementerId,
        hubId: hc.assignedHub.id,
      },
    });
    return {
      success: true,
      message: `Successfully added ${result.supervisorName}`,
    };
  } catch (err) {
    console.error(err);
    return {
      success: false,
      message:
        (err as Error)?.message ?? "Sorry, could add new supervisor details.",
    };
  }
}
