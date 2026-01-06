"use server";

import { ImplementerRole, Prisma } from "@prisma/client";
import { format } from "date-fns";
import type { z } from "zod";
import { FellowDetailsSchema, MarkAttendanceSchema } from "#/app/(platform)/hc/schemas";
import {
  type CurrentHubCoordinator,
  type CurrentSupervisor,
  getCurrentPersonnel,
} from "#/app/auth";
import {
  DropoutFellowSchema,
  WeeklyFellowEvaluationSchema,
} from "#/components/common/fellow/schema";
import { SubmitComplaintSchema } from "#/components/common/schemas";
import { CURRENT_PROJECT_ID } from "#/lib/constants";
import { objectId } from "#/lib/crypto";
import { db } from "#/lib/db";

async function checkAuth() {
  const personnel = await getCurrentPersonnel();
  if (!personnel) {
    throw new Error("The session has not been authenticated");
  }

  return personnel;
}

export async function submitFellowDetails(data: z.infer<typeof FellowDetailsSchema>) {
  try {
    const { profile, session } = await checkAuth();

    const role = session.user.activeMembership?.role;
    if (!role) {
      return {
        success: false,
        message: "Something went wrong. Missing role information",
      };
    }

    if (role !== ImplementerRole.SUPERVISOR && role !== ImplementerRole.HUB_COORDINATOR) {
      return {
        success: false,
        message: "User is not authorised to perform this action",
      };
    }

    const implementerId = session.user.activeMembership?.implementerId;

    if (!implementerId) {
      return {
        success: false,
        message: "Something went wrong. Missing implementer information",
      };
    }

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
      const fellowMember = await db.implementerMember.findFirst({
        where: {
          identifier: id,
          role: "FELLOW",
        },
        select: {
          userId: true,
        },
      });

      if (!fellowMember) {
        return {
          success: false,
          message: "Something went wrong. Fellow user record not found",
        };
      }

      // Check if email exists for any other user
      const existingUser = await db.user.findFirst({
        where: {
          email: fellowEmail,
          NOT: {
            id: fellowMember.userId,
          },
        },
      });

      if (existingUser) {
        return {
          success: false,
          message: "Something went wrong. A user with this email already exists",
        };
      }

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

      // Update the corresponding user's email
      await db.user.update({
        where: {
          id: fellowMember.userId,
        },
        data: {
          email: fellowEmail,
        },
      });

      return {
        success: true,
        message: `Successfully updated details for ${fellowName}`,
      };
    }
    if (mode === "add") {
      // Check if email already exists
      const existingUser = await db.user.findFirst({
        where: {
          email: fellowEmail,
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

      let hubId: string | undefined;
      let supervisorId: string | undefined;

      if (role === ImplementerRole.HUB_COORDINATOR && profile) {
        const hc = profile as NonNullable<CurrentHubCoordinator>["profile"];
        hubId = hc?.assignedHub?.id ?? undefined;
      } else if (role === ImplementerRole.SUPERVISOR && profile) {
        const supervisor = profile as NonNullable<CurrentSupervisor>["profile"];
        supervisorId = supervisor?.id ?? undefined;
        hubId = supervisor?.hubId ?? undefined;
      }

      await db.$transaction(async (tx) => {
        const fellow = await tx.fellow.create({
          data: {
            id: objectId("fellow"),
            hubId,
            supervisorId,
            implementerId,
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

        const user =
          existingUser ||
          (await tx.user.create({
            data: {
              id: objectId("user"),
              email: fellowEmail,
              name: fellowName,
            },
          }));

        await tx.implementerMember.create({
          data: {
            implementerId,
            userId: user.id,
            role: "FELLOW",
            identifier: fellow.id,
          },
        });

        return fellow;
      });
      return {
        success: true,
        message: `Successfully added ${fellowName}`,
      };
    }
    return {
      success: false,
      message: "Something went wrong while trying to add fellow details",
    };
  } catch (err) {
    console.error(err);
    const { mode } = FellowDetailsSchema.parse(data);
    return {
      success: false,
      message:
        (err as Error)?.message ??
        (mode === "edit"
          ? "Something went wrong. Could not update fellow details."
          : "Something went wrong. Could not add new fellow"),
    };
  }
}

export async function submitWeeklyFellowEvaluation(
  data: z.infer<typeof WeeklyFellowEvaluationSchema>,
) {
  try {
    const { profile, session } = await checkAuth();

    const role = session.user.activeMembership?.role;
    if (!role) {
      return {
        success: false,
        message: "Something went wrong. Missing role information",
      };
    }

    if (role !== ImplementerRole.SUPERVISOR) {
      return {
        success: false,
        message: "Something went wrong. User is not authorised to perform this action",
      };
    }

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

    if (mode === "add") {
      const fellow = await db.fellow.findUniqueOrThrow({
        where: {
          id: fellowId,
        },
      });

      if (fellow.supervisorId === profile?.id) {
        const previousEvaluation = await db.weeklyFellowRatings.findFirst({
          where: {
            fellowId,
            supervisorId: profile?.id,
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
              supervisorId: profile?.id,
            },
          });
          return {
            success: true,
            message: "Successfully submitted weekly evaluation",
          };
        }
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
      return {
        success: false,
        message: "Submission failed. Fellow is assigned to a different supervisor.",
      };
    }
    return {
      success: false,
      message: "Something went wrong while trying to submit fellow's weekly evaluation",
    };
  } catch (err) {
    console.error(err);
    return {
      success: false,
      message: (err as Error)?.message ?? "Sorry, could not submit fellow's evaluation.",
    };
  }
}

export async function replaceGroupLeader({
  oldLeaderId: _oldLeaderId,
  leaderId,
  groupId,
}: {
  oldLeaderId: string;
  leaderId: string;
  groupId: string;
}) {
  try {
    await checkAuth();

    const result = await db.interventionGroup.update({
      where: {
        id: groupId,
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
    if (mode === "dropout") {
      const groups = await db.interventionGroup.count({
        where: {
          leaderId: fellowId,
        },
      });

      if (groups > 0) {
        return {
          success: false,
          message: `Sorry, could not drop out fellow. Fellow is still assigned to ${groups} groups. Please assign a new leader to the groups.`,
        };
      }
    }
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

export async function markFellowAttendance(data: z.infer<typeof MarkAttendanceSchema>) {
  try {
    const { session: userSession } = await checkAuth();
    if (!userSession) {
      return {
        success: false,
        message: "Something went wrong. Missing user information",
      };
    }

    const role = userSession.user.activeMembership?.role;
    if (
      !role ||
      (role !== ImplementerRole.SUPERVISOR && role !== ImplementerRole.HUB_COORDINATOR)
    ) {
      return {
        success: false,
        message: "User is not authorised to perform this action",
      };
    }

    const { id, sessionId, absenceReason, attended, comments } = MarkAttendanceSchema.parse(data);

    return await db.$transaction(async (tx) => {
      const fellow = await tx.fellow.findUniqueOrThrow({
        where: {
          id,
        },
      });

      const session = await tx.interventionSession.findFirstOrThrow({
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

      const attendance = await tx.fellowAttendance.findFirst({
        where: {
          fellowId: fellow.id,
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
        if (attendance.processedAt !== null) {
          throw new Error(
            "An error occurred while marking attendance for " +
              fellow.fellowName +
              ". Attendance already processed on " +
              format(attendance.processedAt, "dd-MM-yyyy."),
          );
        }

        let amount = attendance.session?.session?.amount;
        let reason = "MARK_SESSION_ATTENDANCE";
        const attendanceStatus =
          attended === "attended" ? true : attended === "missed" ? false : null;

        if (Number.isInteger(amount) && amount) {
          if (!attendanceStatus) {
            amount = -amount;
            reason = "UNMARK_SESSION_ATTENDANCE";
          }

          const existingPayout = await tx.payoutStatements.findFirst({
            where: {
              fellowId: fellow.id,
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
            if (!userSession.user.id) {
              throw new Error("User ID is required to create payout statement");
            }

            await tx.payoutStatements.create({
              data: {
                fellowId: fellow.id,
                fellowAttendanceId: attendance.id,
                createdBy: userSession.user.id,
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

        await tx.fellowAttendance.update({
          where: {
            id: attendance.id,
          },
          data: {
            markedBy: userSession.user.id,
            fellowId: fellow.id,
            absenceReason: attendanceStatus === false ? absenceReason : null,
            absenceComments: attendanceStatus === false ? comments : null,
            attended: attendanceStatus,
          },
        });

        return {
          success: true,
          message: `Successfully updated attendance for ${fellow.fellowName}`,
        };
      }
      let groupId: string | undefined;
      if (session.schoolId) {
        const group = await tx.interventionGroup.findFirst({
          where: {
            schoolId: session.schoolId,
            leaderId: fellow.id,
          },
        });
        if (group) {
          if (group.groupType !== "TREATMENT" && session.session?.sessionType === "INTERVENTION") {
            throw new Error(
              "An error occurred while marking attendance. " +
                fellow.fellowName +
                "'s group is not a treatment group.",
            );
          }
          groupId = group.id;
        } else {
          throw new Error(
            "An error occurred while marking attendance. " +
              fellow.fellowName +
              " has no assigned group",
          );
        }
      }

      if (session.session?.amount === undefined || session.session?.amount === null) {
        throw new Error(
          "An error occurred while marking attendance for " +
            fellow.fellowName +
            ". Session payout amount not found.",
        );
      }

      const attendanceStatus =
        attended === "attended" ? true : attended === "missed" ? false : null;

      await tx.fellowAttendance.create({
        data: {
          fellowId: fellow.id,
          groupId,
          schoolId: session.schoolId,
          projectId: session.projectId ?? CURRENT_PROJECT_ID,
          sessionId,
          absenceReason,
          absenceComments: comments,
          markedBy: userSession.user.id,
          attended: attendanceStatus,
          PayoutStatements:
            attendanceStatus && userSession.user.id
              ? {
                  create: [
                    {
                      fellowId: fellow.id,
                      createdBy: userSession.user.id,
                      amount: session.session?.amount ?? 0,
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
    });
  } catch (err) {
    console.error(err);
    return {
      success: false,
      message: (err as Error)?.message ?? "An error occurred while marking attendance.",
    };
  }
}

export async function markManyFellowAttendance(
  ids: string[],
  data: z.infer<typeof MarkAttendanceSchema>,
) {
  try {
    const { session: userSession } = await checkAuth();
    if (!userSession) {
      return {
        success: false,
        message: "Something went wrong. Missing user information",
      };
    }

    const role = userSession.user.activeMembership?.role;
    if (
      !role ||
      (role !== ImplementerRole.SUPERVISOR && role !== ImplementerRole.HUB_COORDINATOR)
    ) {
      return {
        success: false,
        message: "User is not authorised to perform this action",
      };
    }

    const { sessionId, absenceReason, attended, comments } = MarkAttendanceSchema.parse(data);

    return await db.$transaction(async (tx) => {
      const session = await tx.interventionSession.findFirstOrThrow({
        where: {
          id: sessionId,
        },
        include: {
          session: true,
        },
      });

      if (!session.occurred) {
        throw new Error("An error occurred while marking attendances. Session has not occurred.");
      }

      if (!Number.isInteger(session.session?.amount)) {
        throw new Error(
          "An error occurred while marking attendances. Session payout amount not found.",
        );
      }

      const attendanceStatus =
        attended === "attended" ? true : attended === "missed" ? false : null;
      const amount = session.session?.amount ?? 0;

      // update existing attendances
      const attendances = await tx.fellowAttendance.findMany({
        where: {
          fellowId: {
            in: ids,
          },
          sessionId,
        },
        include: {
          fellow: true,
          PayoutStatements: true,
        },
      });

      const data: {
        payout: Prisma.PayoutStatementsUncheckedCreateInput | undefined;
        id: number;
        fellowId: string;
      }[] = [];

      attendances.forEach((attendance) => {
        if (attendance.processedAt !== null) {
          throw new Error(
            "An error occurred while marking attendances. " +
              attendance.fellow.fellowName +
              "'s attendance has already been processed on " +
              format(attendance.processedAt, "dd-MM-yyyy."),
          );
        }

        let reason = "MARK_SESSION_ATTENDANCE";
        let _amount = amount;
        if (!attendanceStatus && amount) {
          _amount = -amount;
          reason = "UNMARK_SESSION_ATTENDANCE";
        }

        const existingPayouts = attendance.PayoutStatements.sort((a, b) => {
          return b.createdAt.getTime() - a.createdAt.getTime();
        });

        let payout: Prisma.PayoutStatementsUncheckedCreateInput | undefined;
        if (
          ((existingPayouts.length === 0 && attendanceStatus) ||
            (existingPayouts.length !== 0 && existingPayouts[0]?.reason !== reason)) &&
          amount &&
          userSession.user.id
        ) {
          payout = {
            fellowId: attendance.fellow.id,
            fellowAttendanceId: attendance.id,
            createdBy: userSession.user.id,
            amount: _amount,
            reason,
            mpesaNumber: attendance.fellow.mpesaNumber,
          };
        }

        data.push({
          payout,
          id: attendance.id,
          fellowId: attendance.fellow.id,
        });
      });

      await tx.payoutStatements.createMany({
        data: data
          .filter((attendance) => attendance.payout !== undefined)
          .map((x) => x.payout)
          .filter((payout): payout is NonNullable<typeof payout> => payout !== undefined),
      });

      await tx.fellowAttendance.updateMany({
        where: {
          id: {
            in: data.map((attendance) => attendance.id),
          },
        },
        data: {
          absenceReason: attendanceStatus === false ? absenceReason : null,
          absenceComments: attendanceStatus === false ? comments : null,
          attended: attendanceStatus,
        },
      });

      // create new attendances
      const fellowIds = ids.filter((fellowId) => {
        return !attendances.some((attendance) => attendance.fellowId === fellowId);
      });

      const fellows = await tx.fellow.findMany({
        where: {
          id: {
            in: fellowIds,
          },
        },
      });

      let validFellows: Array<{
        fellow: (typeof fellows)[0];
        groupId: string | undefined;
      }> = [];

      if (session.schoolId) {
        const groups = await tx.interventionGroup.findMany({
          where: {
            schoolId: session.schoolId,
            leaderId: {
              in: fellowIds,
            },
          },
        });

        const groupsByFellowId = new Map(groups.map((group) => [group.leaderId, group]));

        for (const fellow of fellows) {
          const group = groupsByFellowId.get(fellow.id);

          if (!group) {
            throw new Error(
              "An error occurred while marking attendance. " +
                fellow.fellowName +
                " has no assigned group",
            );
          }

          if (group.groupType !== "TREATMENT" && session.session?.sessionType === "INTERVENTION") {
            throw new Error(
              "An error occurred while marking attendance. " +
                fellow.fellowName +
                "'s group is not a treatment group.",
            );
          }

          validFellows.push({ fellow, groupId: group.id });
        }
      } else {
        validFellows = fellows.map((fellow) => ({
          fellow,
          groupId: undefined,
        }));
      }

      const data2 = validFellows.map(({ fellow, groupId }) => {
        return {
          attendanceData: {
            fellowId: fellow.id,
            schoolId: session.schoolId,
            groupId,
            projectId: session.projectId ?? CURRENT_PROJECT_ID,
            absenceReason: attendanceStatus === false ? absenceReason : null,
            absenceComments: attendanceStatus === false ? comments : null,
            sessionId,
            markedBy: userSession.user.id,
            attended: attendanceStatus,
          },
        };
      });

      const newAttendances = await tx.fellowAttendance.createManyAndReturn({
        data: data2.map((x) => x.attendanceData),
        include: {
          fellow: true,
        },
      });

      if (attendanceStatus && userSession.user.id) {
        const userId = userSession.user.id;
        const payoutData = newAttendances.map((attendance) => {
          return {
            fellowId: attendance.fellow.id,
            fellowAttendanceId: attendance.id,
            createdBy: userId,
            amount: amount,
            reason: "MARK_SESSION_ATTENDANCE",
            mpesaNumber: attendance.fellow.mpesaNumber,
          };
        });

        await tx.payoutStatements.createMany({
          data: payoutData,
        });
      }

      return {
        success: true,
        message: `Successfully marked attendances for ${ids.length} fellows.`,
      };
    });
  } catch (err) {
    console.error(err);
    return {
      success: false,
      message: (err as Error)?.message ?? "An error occurred while marking attendances.",
    };
  }
}

export async function submitFellowComplaint(data: z.infer<typeof SubmitComplaintSchema>) {
  try {
    const { session: userSession } = await checkAuth();
    if (!userSession) {
      return {
        success: false,
        message: "Something went wrong. Missing user information",
      };
    }

    const { id, complaint, comments } = SubmitComplaintSchema.parse(data);
    const result = await db.fellowComplaints.create({
      data: {
        fellowId: id,
        complaint,
        comments,
        createdBy: userSession.user.id,
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
