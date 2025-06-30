"use server";

import {
  AddNewSupervisorSchema,
  DropoutSupervisorSchema,
  EditSupervisorSchema,
  MarkSupervisorAttendanceSchema,
  MonthlySupervisorEvaluationSchema,
  SubmitComplaintSchema,
  WeeklyHubTeamMeetingSchema,
} from "#/app/(platform)/hc/schemas";
import { currentHubCoordinator, getCurrentUser } from "#/app/auth";
import { db } from "#/lib/db";

import { CURRENT_PROJECT_ID } from "#/lib/constants";
import { objectId } from "#/lib/crypto";
import type { z } from "zod";

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
        dropOutReason: data.dropoutReason,
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
        dropOutReason: null,
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
    const result = await db.supervisorComplaints.create({
      data: {
        supervisorId: parsedData.supervisorId,
        complaint: parsedData.complaint,
        comments: parsedData.comments,
        hubCoordinatorId: hubCoordinator.id!,
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
    }
      return {
        error: "Something went wrong while updating supervisor attendance",
      };
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
      dateOfBirth,
    } = EditSupervisorSchema.parse(data);

    // Get the current supervisor's user ID
    const supervisorMember = await db.implementerMember.findFirst({
      where: {
        identifier: supervisorId,
        role: "SUPERVISOR",
      },
      select: {
        userId: true,
      },
    });

    if (!supervisorMember) {
      return {
        success: false,
        message: "Something went wrong. Supervisor user record not found",
      };
    }

    // Check if email exists for any other user
    const existingUser = await db.user.findFirst({
      where: {
        email: personalEmail,
        NOT: {
          id: supervisorMember.userId,
        },
      },
    });

    if (existingUser) {
      return {
        success: false,
        message: "Something went wrong. A user with this email already exists",
      };
    }

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
        dateOfBirth,
      },
    });

    // Update the corresponding user's email
    await db.user.update({
      where: {
        id: supervisorMember.userId,
      },
      data: {
        email: personalEmail,
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
    const assignedHub = hc.assignedHub;

    // Check if email already exists
    const existingUser = await db.user.findUnique({
      where: {
        email: parsedData.personalEmail,
      },
      include: {
        memberships: true,
      },
    });

    if (existingUser) {
      if (existingUser.memberships.length > 0) {
        return {
          success: false,
          message: "A user with this email already exists in the system",
        };
      }
    }

    const result = await db.$transaction(async (tx) => {
      const supervisor = await tx.supervisor.create({
        data: {
          ...parsedData,
          id: objectId("sup"),
          implementerId: assignedHub.implementerId,
          hubId: assignedHub.id,
        },
      });

      const user =
        existingUser ||
        (await tx.user.create({
          data: {
            id: objectId("user"),
            email: parsedData.personalEmail,
            name: parsedData.supervisorName,
          },
        }));

      await tx.implementerMember.create({
        data: {
          implementerId: assignedHub.implementerId,
          userId: user.id,
          role: "SUPERVISOR",
          identifier: supervisor.id,
        },
      });

      return supervisor;
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
        (err as Error)?.message ??
        "Sorry, could not add new supervisor details.",
    };
  }
}

export async function submitMonthlySupervisorEvaluation(
  data: z.infer<typeof MonthlySupervisorEvaluationSchema>,
) {
  try {
    const hc = await currentHubCoordinator();
    const user = await getCurrentUser();

    if (!hc || !user) {
      throw new Error("The session has not been authenticated");
    }

    const {
      respectfulness,
      attitude,
      collaboration,
      reliability,
      identificationOfIssues,
      leadership,
      communicationStyle,
      conflictResolution,
      adaptability,
      recognitionAndFeedback,
      decisionMaking,
      fellowRecruitmentEffectiveness,
      fellowTrainingEffectiveness,
      programLogisticsCoordination,
      programSessionAttendance,
      workplaceDemeanorComments,
      managementStyleComments,
      programExecutionComments,
      supervisorId,
      month,
    } = MonthlySupervisorEvaluationSchema.parse(data);

    const match = await db.monthlySupervisorEvaluation.findFirst({
      where: {
        month,
        supervisorId,
        projectId: CURRENT_PROJECT_ID,
      },
    });
    if (match === null) {
      await db.monthlySupervisorEvaluation.create({
        data: {
          supervisorId,
          hubCoordinatorId: hc.id!,
          projectId: CURRENT_PROJECT_ID,
          month,
          respectfulness,
          attitude,
          collaboration,
          reliability,
          identificationOfIssues,
          workplaceDemeanorComments,
          leadership,
          communicationStyle,
          conflictResolution,
          adaptability,
          recognitionAndFeedback,
          decisionMaking,
          managementStyleComments,
          fellowRecruitmentEffectiveness,
          fellowTrainingEffectiveness,
          programLogisticsCoordination,
          programSessionAttendance,
          programExecutionComments,
        },
      });
      return {
        success: true,
        message: "Successfully submitted monthly evaluation.",
      };
    }
      await db.monthlySupervisorEvaluation.update({
        where: {
          id: match.id,
        },
        data: {
          respectfulness,
          attitude,
          collaboration,
          reliability,
          identificationOfIssues,
          workplaceDemeanorComments,
          leadership,
          communicationStyle,
          conflictResolution,
          adaptability,
          recognitionAndFeedback,
          decisionMaking,
          managementStyleComments,
          fellowRecruitmentEffectiveness,
          fellowTrainingEffectiveness,
          programLogisticsCoordination,
          programSessionAttendance,
          programExecutionComments,
        },
      });
      return {
        success: true,
        message: "Successfully updated monthly evaluation.",
      };
  } catch (err) {
    console.error(err);
    return {
      success: false,
      message:
        (err as Error)?.message ??
        "Sorry, could not submit supervisor evaluation.",
    };
  }
}

export type SupervisorDropoutReasonsGraphData = {
  name: string;
  value: number;
};

export async function fetchSupervisorDropoutReasons(hudId: string) {
  const dropoutData = await db.$queryRaw<SupervisorDropoutReasonsGraphData[]>`
    SELECT
      COUNT(*) AS value,
      drop_out_reason AS name
    FROM supervisors
    WHERE
      drop_out_reason IS NOT NULL
      AND dropped_out = true
      AND hub_id = ${hudId}
    GROUP BY
      drop_out_reason
  `;

  dropoutData.forEach((data) => {
    data.value = Math.round(data.value);
  });

  return dropoutData;
}

export async function fetchSupervisorDataCompletenessData(hubId: string) {
  const [supervisorData] = await db.$queryRaw<{ percentage: number }[]>`
    SELECT
      AVG((
        (CASE WHEN supervisor_name IS NOT NULL THEN 1 ELSE 0 END)
        + (CASE WHEN supervisor_email IS NOT NULL THEN 1 ELSE 0 END)
        + (CASE WHEN date_of_birth IS NOT NULL THEN 1 ELSE 0 END)
        + (CASE WHEN hub_id IS NOT NULL THEN 1 ELSE 0 END)
        + (CASE WHEN id_number IS NOT NULL THEN 1 ELSE 0 END)
        + (CASE WHEN personal_email IS NOT NULL THEN 1 ELSE 0 END)
      ) / 6.0 * 100) AS percentage
    FROM supervisors
    WHERE hub_id = ${hubId}
  `;

  if (!supervisorData) {
    return [];
  }

  const percentage = Math.round(supervisorData.percentage);

  return [
    { name: "actual", value: percentage },
    { name: "difference", value: 100 - percentage },
  ];
}

export type SessionRatingAverages = {
  session_type: "s0" | "s1" | "s2" | "s3" | "s4";
  student_behaviour: number;
  admin_support: number;
  workload: number;
};

export async function fetchSupervisorSessionRatingAverages(hubId: string) {
  const ratingAverages = await db.$queryRaw<SessionRatingAverages[]>`
    SELECT
      ses.session_type AS session_type,
      AVG(isr.student_behavior_rating) AS student_behavior,
      AVG(isr.admin_support_rating) AS admin_support,
      AVG(isr.workload_rating) AS workload
    FROM intervention_session_ratings isr
    INNER JOIN supervisors AS sup ON isr.supervisor_id = sup.id
    INNER JOIN intervention_sessions AS ses ON isr.session_id = ses.id
    WHERE
      sup.hub_id = ${hubId}
    GROUP BY
      ses.session_type
    ORDER BY
      ses.session_type
  `;

  if (!ratingAverages.length) {
    return [];
  }

  // @ts-ignore
  ratingAverages.forEach((item) => {
    item.student_behaviour = Math.round(item.student_behaviour) || 0;
    item.admin_support = Math.round(item.admin_support) || 0;
    item.workload = Math.round(item.workload) || 0;
  });

  return ratingAverages;
}
export type SupervisorAttendanceData = {
  supervisor_name: string;
  attended: number;
};

export async function fetchSupervisorAttendanceData(hubId: string) {
  const supervisorAttendanceData = await db.$queryRaw<
    SupervisorAttendanceData[]
  >`
    SELECT
      sup.supervisor_name AS supervisor_name,
      COUNT(sa.attended)::integer AS attended
    FROM supervisor_attendances sa
    INNER JOIN supervisors sup ON sa.supervisor_id = sup.id
    WHERE sup.hub_id = ${hubId} AND (sa.attended IS NOT NULL AND sa.attended = true)
    GROUP BY sup.supervisor_name
  `;

  return supervisorAttendanceData;
}
