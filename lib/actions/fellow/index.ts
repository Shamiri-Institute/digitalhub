"use server";

import {
  FellowDetailsSchema,
  MarkAttendanceSchema,
} from "#/app/(platform)/hc/schemas";
import {
  currentHubCoordinator,
  currentSupervisor,
  getCurrentUser,
} from "#/app/auth";
import {
  DropoutFellowSchema,
  WeeklyFellowEvaluationSchema,
} from "#/components/common/fellow/schema";
import { CURRENT_PROJECT_ID } from "#/lib/constants";
import { objectId } from "#/lib/crypto";
import { db } from "#/lib/db";
import { generateFellowVisibleID } from "#/lib/utils";
import { Prisma } from "@prisma/client";
import { z } from "zod";

async function checkAuth() {
  const hubCoordinator = await currentHubCoordinator();
  const supervisor = await currentSupervisor();

  if (!hubCoordinator && !supervisor) {
    throw new Error("The session has not been authenticated");
  }

  const user = await getCurrentUser();
  return { hubCoordinator, supervisor, user };
}

export async function submitFellowDetails(
  data: z.infer<typeof FellowDetailsSchema>,
) {
  try {
    const { hubCoordinator, supervisor } = await checkAuth();

    const {
      id,
      fellowName,
      fellowEmail,
      county,
      subCounty,
      cellNumber,
      mpesaName,
      mpesaNumber,
      gender,
      idNumber,
      dateOfBirth,
      mode,
    } = FellowDetailsSchema.parse(data);

    if (mode === "edit") {
      await db.fellow.update({
        where: {
          id,
        },
        data: {
          fellowName,
          fellowEmail,
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
      return {
        success: true,
        message: `Successfully updated details for ${fellowName}`,
      };
    } else if (mode === "add" && (hubCoordinator || supervisor)) {
      // TODO: Let's track this as a serial number on implementer
      const fellowsCreatedThisYearCount = await db.fellow.count({
        where: {
          createdAt: {
            gte: new Date(new Date().getFullYear(), 0, 1),
          },
        },
      });

      await db.fellow.create({
        data: {
          id: objectId("fellow"),
          visibleId: generateFellowVisibleID(fellowsCreatedThisYearCount),
          hubId: supervisor?.hubId ?? hubCoordinator?.assignedHubId,
          supervisorId: supervisor?.id,
          implementerId:
            supervisor?.implementerId ?? hubCoordinator?.implementerId,
          fellowName,
          fellowEmail,
          cellNumber,
          mpesaName,
          mpesaNumber,
          idNumber,
          county,
          subCounty,
          dateOfBirth,
          gender,
        },
      });
      return {
        success: true,
        message: `Successfully added ${fellowName}`,
      };
    } else {
      return {
        success: false,
        message:
          hubCoordinator === null && supervisor === null
            ? `User is not authorised to perform this action`
            : "Something went wrong",
      };
    }
  } catch (err) {
    console.error(err);
    const { mode } = FellowDetailsSchema.parse(data);
    return {
      success: false,
      message:
        ((err as Error)?.message ?? mode === "edit")
          ? "Sorry, could not update fellow details."
          : "Sorry, could not add new fellow",
    };
  }
}

export async function submitWeeklyFellowEvaluation(
  data: z.infer<typeof WeeklyFellowEvaluationSchema>,
) {
  try {
    const { supervisor } = await checkAuth();

    const {
      fellowId,
      behaviourNotes,
      behaviourRating,
      punctualityNotes,
      punctualityRating,
      programDeliveryNotes,
      programDeliveryRating,
      dressingAndGroomingNotes,
      dressingAndGroomingRating,
      mode,
      week,
    } = WeeklyFellowEvaluationSchema.parse(data);

    if (mode === "add" && supervisor) {
      const fellow = await db.fellow.findUniqueOrThrow({
        where: {
          id: fellowId,
        },
      });

      if (fellow.supervisorId === supervisor.id) {
        const previousEvaluation = await db.weeklyFellowRatings.findFirst({
          where: {
            fellowId,
            supervisorId: supervisor.id,
            week: new Date(week),
          },
        });

        if (previousEvaluation === null) {
          await db.weeklyFellowRatings.create({
            data: {
              week,
              fellowId,
              behaviourNotes,
              behaviourRating,
              punctualityNotes,
              punctualityRating,
              programDeliveryNotes,
              programDeliveryRating,
              dressingAndGroomingNotes,
              dressingAndGroomingRating,
              supervisorId: supervisor.id,
            },
          });
          return {
            success: true,
            message: `Successfully submitted weekly evaluation`,
          };
        } else {
          await db.weeklyFellowRatings.update({
            where: {
              id: previousEvaluation.id,
            },
            data: {
              behaviourNotes,
              behaviourRating,
              punctualityNotes,
              punctualityRating,
              programDeliveryNotes,
              programDeliveryRating,
              dressingAndGroomingNotes,
              dressingAndGroomingRating,
            },
          });
          return {
            success: true,
            message: `Successfully updated fellow's weekly evaluation`,
          };
        }
      } else {
        return {
          success: false,
          message:
            "Submission failed. Fellow is assigned to a different supervisor.",
        };
      }
    } else {
      return {
        success: false,
        message:
          supervisor === null
            ? `User is not authorised to perform this action`
            : "Something went wrong",
      };
    }
  } catch (err) {
    console.error(err);
    return {
      success: false,
      message:
        (err as Error)?.message ??
        "Sorry, could not submit fellow's evaluation.",
    };
  }
}

export async function replaceGroupLeader({
  leaderId,
  groupId,
  schoolVisibleId,
}: {
  leaderId: string;
  groupId: string;
  schoolVisibleId: string;
}) {
  try {
    await checkAuth();

    const result = await db.interventionGroup.update({
      where: {
        id: groupId,
        school: {
          visibleId: schoolVisibleId,
        },
      },
      data: {
        leaderId,
      },
      include: {
        leader: true,
      },
    });
    return {
      success: true,
      message: `Group ${result.groupName} successfully assigned to ${result.leader.fellowName}`,
    };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === "P2002") {
        const result = await db.interventionGroup.findFirst({
          where: {
            school: {
              visibleId: schoolVisibleId,
            },
            leaderId,
          },
          include: {
            leader: true,
          },
        });
        if (result !== null) {
          return {
            success: false,
            message: `Sorry, could not replace fellow. ${result.leader.fellowName} is already assigned to group ${result.groupName}`,
          };
        }
      }
    }
    console.error(err);
    return {
      success: false,
      message: (err as Error)?.message ?? "Sorry, could not replace fellow",
    };
  }
}

export async function dropoutFellow(data: z.infer<typeof DropoutFellowSchema>) {
  try {
    await checkAuth();

    const { fellowId, mode, dropoutReason } = DropoutFellowSchema.parse(data);
    const result = await db.fellow.update({
      data: {
        droppedOut: mode === "dropout",
        dropOutReason: mode === "dropout" ? dropoutReason : null,
        droppedOutAt: mode === "dropout" ? new Date() : null,
      },
      where: {
        id: fellowId,
      },
    });

    return {
      success: true,
      message:
        mode === "dropout"
          ? `${result.fellowName} successfully dropped out.`
          : `${result.fellowName} successfully un-dropped.`,
    };
  } catch (e) {
    console.error(e);
    return {
      success: false,
      message: `Something went wrong while trying to ${data.mode === "dropout" ? "drop out fellow" : "undo drop out"}`,
    };
  }
}

export async function markFellowAttendance(
  data: z.infer<typeof MarkAttendanceSchema>,
) {
  try {
    const auth = await checkAuth();

    const { id, sessionId, absenceReason, attended, comments } =
      MarkAttendanceSchema.parse(data);
    const fellow = await db.fellow.findUniqueOrThrow({
      where: {
        id,
      },
    });

    if (fellow) {
      const attendance = await db.fellowAttendance.findFirst({
        where: {
          fellowId: id,
          sessionId,
        },
      });

      if (attendance) {
        const attendanceStatus =
          attended === "attended" ? true : attended === "missed" ? false : null;
        await db.fellowAttendance.update({
          where: {
            id: attendance.id,
          },
          data: {
            markedBy: auth.user!.user.id,
            fellowId: id,
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
          message: `Successfully updated attendance for ${fellow.fellowName}`,
        };
      } else {
        const session = await db.interventionSession.findFirstOrThrow({
          where: {
            id: sessionId,
          },
        });
        let groupId;
        if (session.schoolId && id) {
          const group = await db.interventionGroup.findFirst({
            where: {
              schoolId: session.schoolId,
              leaderId: id,
            },
          });
          if (group) {
            groupId = group.id;
          } else {
            throw new Error(fellow.fellowName + " has no assigned group");
          }
        }
        await db.fellowAttendance.create({
          data: {
            fellowId: id!,
            groupId,
            schoolId: session.schoolId,
            projectId: session.projectId ?? CURRENT_PROJECT_ID,
            sessionId,
            absenceReason,
            absenceComments: comments,
            markedBy: auth.user!.user.id,
            supervisorId: auth.supervisor?.id!,
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
          message: `Successfully marked attendance for ${fellow.fellowName}`,
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

export async function markManyFellowAttendance(
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
    ids.map(async (fellowId) => {
      const attendance = await db.fellowAttendance.findFirst({
        where: {
          fellowId,
          sessionId,
        },
      });

      const attendanceStatus =
        attended === "attended" ? true : attended === "missed" ? false : null;
      if (attendance) {
        await db.fellowAttendance.update({
          where: {
            id: attendance.id,
          },
          data: {
            markedBy: auth.user!.user.id,
            fellowId,
            absenceReason: attendanceStatus === false ? absenceReason : null,
            absenceComments: attendanceStatus === false ? comments : null,
            attended: attendanceStatus,
          },
        });
      } else {
        let fellow;
        if (!auth.supervisor && auth.hubCoordinator) {
          fellow = await db.fellow.findFirst({
            where: {
              id: fellowId,
            },
          });
        }
        let groupId;
        if (session.schoolId && fellow) {
          const group = await db.interventionGroup.findFirst({
            where: {
              schoolId: session.schoolId,
              leaderId: fellow.id,
            },
          });
          if (group) {
            groupId = group.id;
          } else {
            throw new Error(fellow.fellowName + " has no assigned group");
          }
        }
        await db.fellowAttendance.create({
          data: {
            fellowId,
            schoolId: session.schoolId,
            groupId,
            projectId: session.projectId ?? CURRENT_PROJECT_ID,
            absenceReason,
            absenceComments: comments,
            sessionId,
            supervisorId: auth.supervisor?.id ?? fellow?.supervisorId!,
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
        message: `Successfully marked attendances for ${ids.length} fellows.`,
      };
    })
    .catch((error: unknown) => {
      console.error(error);
      return {
        success: false,
        message: "Something went wrong while updating fellow attendance",
      };
    });
}
