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
        include: {
          session: {
            include: {
              session: true,
            },
          },
        },
      });

      if (attendance) {
        let amount = attendance.session?.session?.amount;
        let reason = "MARK_SESSION_ATTENDANCE";
        const attendanceStatus =
          attended === "attended" ? true : attended === "missed" ? false : null;

        if (amount) {
          if (!attendanceStatus) {
            amount = -amount;
            reason = "UNMARK_SESSION_ATTENDANCE";
          }

          const existingPayout = await db.payoutStatements.findFirst({
            where: {
              fellowId: id!,
              fellowAttendanceId: attendance.id,
            },
            orderBy: {
              createdAt: "desc",
            },
          });

          if (
            (!existingPayout && attendanceStatus) ||
            (existingPayout && existingPayout.reason !== reason)
          ) {
            await db.payoutStatements.create({
              data: {
                fellowId: id!,
                fellowAttendanceId: attendance.id,
                createdBy: auth.user!.user.id,
                amount,
                reason,
                mpesaNumber: fellow.mpesaNumber,
              },
            });
          }
        } else {
          throw new Error(
            "An error occurred while marking attendance. Session missing payout amount.",
          );
        }

        await db.fellowAttendance.update({
          where: {
            id: attendance.id,
          },
          data: {
            markedBy: auth.user!.user.id,
            fellowId: id,
            absenceReason: attendanceStatus === false ? absenceReason : null,
            absenceComments: attendanceStatus === false ? comments : null,
            attended: attendanceStatus,
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
          include: {
            session: true,
          },
        });

        if (!session.occurred) {
          throw new Error(
            "An error occurred while marking attendance for " +
              fellow.fellowName +
              ". Session has not occurred.",
          );
        }

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

        if (!session.session?.amount) {
          throw new Error(
            "An error occurred while marking attendance for " +
              fellow.fellowName +
              ". Session payout amount not found.",
          );
        }

        if (!id) {
          throw new Error("Fellow ID not found");
        }

        const attendanceStatus =
          attended === "attended" ? true : attended === "missed" ? false : null;
        await db.fellowAttendance.create({
          data: {
            fellowId: id,
            groupId,
            schoolId: session.schoolId,
            projectId: session.projectId ?? CURRENT_PROJECT_ID,
            sessionId,
            absenceReason,
            absenceComments: comments,
            markedBy: auth.user!.user.id,
            attended: attendanceStatus,
            PayoutStatements: attendanceStatus
              ? {
                  create: [
                    {
                      fellowId: id,
                      createdBy: auth.user!.user.id,
                      amount: session.session?.amount,
                      reason: "MARK_SESSION_ATTENDANCE",
                      mpesaNumber: fellow.mpesaNumber,
                    },
                  ],
                }
              : undefined,
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
        message: `Fellow details not found.`,
      };
    }
  } catch (err) {
    console.error(err);
    return {
      success: false,
      message:
        (err as Error)?.message ?? "Sorry, could not mark fellow attendance.",
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
    include: {
      session: true,
    },
  });

  const _amount = session.session?.amount;
  if (!Number.isInteger(_amount)) {
    throw new Error(
      "An error occurred while marking attendance. Session payout amount not found.",
    );
  }

  return await Promise.all(
    ids.map(async (fellowId) => {
      const attendance = await db.fellowAttendance.findFirst({
        where: {
          fellowId,
          sessionId,
        },
      });

      const fellow = await db.fellow.findFirstOrThrow({
        where: {
          id: fellowId,
        },
      });

      const attendanceStatus =
        attended === "attended" ? true : attended === "missed" ? false : null;
      let amount = session.session?.amount!;

      if (attendance) {
        let reason = "MARK_SESSION_ATTENDANCE";
        if (!attendanceStatus) {
          amount = -amount;
          reason = "UNMARK_SESSION_ATTENDANCE";
        }

        const existingPayout = await db.payoutStatements.findFirst({
          where: {
            fellowId,
            fellowAttendanceId: attendance.id,
          },
          orderBy: {
            createdAt: "desc",
          },
        });

        if (
          ((!existingPayout && attendanceStatus) ||
            (existingPayout && existingPayout.reason !== reason)) &&
          amount
        ) {
          await db.payoutStatements.create({
            data: {
              fellowId,
              fellowAttendanceId: attendance.id,
              createdBy: auth.user!.user.id,
              amount,
              reason,
              mpesaNumber: fellow.mpesaNumber,
            },
          });
        }

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
        let groupId;
        if (session.schoolId) {
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

        const payouts = attendanceStatus
          ? [
              {
                fellowId,
                createdBy: auth.user!.user.id,
                amount: amount!,
                reason: "MARK_SESSION_ATTENDANCE",
                mpesaNumber: fellow?.mpesaNumber,
              },
            ]
          : [];
        await db.fellowAttendance.create({
          data: {
            fellowId,
            schoolId: session.schoolId,
            groupId,
            projectId: session.projectId ?? CURRENT_PROJECT_ID,
            absenceReason,
            absenceComments: comments,
            sessionId,
            markedBy: auth.user!.user.id,
            attended: attendanceStatus,
            PayoutStatements: {
              create: payouts,
            },
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
