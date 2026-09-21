"use server";

import { and, eq, inArray, isNull, sql } from "drizzle-orm";
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
import { db, isUniqueViolation, queryRaw, type TransactionCursor } from "#/db/client";
import { ImplementerRole } from "#/db/enums";
import {
  fellow,
  fellowAttendance,
  fellowComplaints,
  implementerMember,
  interventionGroup,
  payoutStatements,
  user,
  weeklyFellowRatings,
} from "#/db/schema";
import { objectId } from "#/lib/crypto";

async function checkAuth() {
  const personnel = await getCurrentPersonnel();
  if (!personnel) {
    throw new Error("The session has not been authenticated");
  }

  return personnel;
}

const attendedFlag = (attended: string | undefined) =>
  attended === "attended" ? true : attended === "missed" ? false : null;

async function requireFellow(tx: TransactionCursor | typeof db, id: string) {
  const row = await tx.query.fellow.findFirst({ where: (f, { eq }) => eq(f.id, id) });
  if (!row) {
    throw new Error(`Fellow ${id} not found`);
  }
  return row;
}

async function requireSessionWithName(tx: TransactionCursor, sessionId: string) {
  const row = await tx.query.interventionSession.findFirst({
    where: (s, { eq }) => eq(s.id, sessionId),
    with: { session: true },
  });
  if (!row) {
    throw new Error(`Intervention session ${sessionId} not found`);
  }
  return row;
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
      if (!id) {
        throw new Error("Fellow id is required to edit a fellow");
      }
      const fellowMember = await db.query.implementerMember.findFirst({
        where: (m, { and, eq }) => and(eq(m.identifier, id), eq(m.role, "FELLOW")),
        columns: { userId: true },
      });

      if (!fellowMember) {
        return {
          success: false,
          message: "Something went wrong. Fellow user record not found",
        };
      }

      // Check if email exists for any other user
      const existingUser = await db.query.user.findFirst({
        where: (u, { and, eq, ne }) => and(eq(u.email, fellowEmail), ne(u.id, fellowMember.userId)),
      });

      if (existingUser) {
        return {
          success: false,
          message: "Something went wrong. A user with this email already exists",
        };
      }

      const updated = await db
        .update(fellow)
        .set({
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
        })
        .where(eq(fellow.id, id))
        .returning({ id: fellow.id });
      if (updated.length === 0) {
        throw new Error(`Fellow ${id} not found`);
      }

      // Update the corresponding user's email
      const updatedUsers = await db
        .update(user)
        .set({ email: fellowEmail })
        .where(eq(user.id, fellowMember.userId))
        .returning({ id: user.id });
      if (updatedUsers.length === 0) {
        throw new Error(`User ${fellowMember.userId} not found`);
      }

      return {
        success: true,
        message: `Successfully updated details for ${fellowName}`,
      };
    }
    if (mode === "add") {
      // Check if email already exists
      const existingUser = await db.query.user.findFirst({
        where: (u, { eq }) => eq(u.email, fellowEmail),
        with: { memberships: true },
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

      await db.transaction(async (tx) => {
        const [created] = await tx
          .insert(fellow)
          .values({
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
          })
          .returning();
        if (!created) {
          throw new Error("Could not create the fellow");
        }

        let userId = existingUser?.id;
        if (!userId) {
          const [createdUser] = await tx
            .insert(user)
            .values({ id: objectId("user"), email: fellowEmail, name: fellowName })
            .returning({ id: user.id });
          if (!createdUser) {
            throw new Error("Could not create the fellow's user");
          }
          userId = createdUser.id;
        }

        await tx.insert(implementerMember).values({
          implementerId,
          userId,
          role: "FELLOW",
          identifier: created.id,
        });

        return created;
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
      const fellowRow = await requireFellow(db, fellowId);

      if (fellowRow.supervisorId === profile?.id) {
        const supervisorId = profile?.id;
        const previousEvaluation = await db.query.weeklyFellowRatings.findFirst({
          where: (w, { and, eq }) =>
            and(
              eq(w.fellowId, fellowId),
              supervisorId ? eq(w.supervisorId, supervisorId) : undefined,
              eq(w.week, new Date(week)),
            ),
        });

        if (previousEvaluation === undefined) {
          if (!supervisorId) {
            throw new Error("Supervisor id is required to submit an evaluation");
          }
          await db.insert(weeklyFellowRatings).values({
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
            supervisorId,
          });
          return {
            success: true,
            message: "Successfully submitted weekly evaluation",
          };
        }
        await db
          .update(weeklyFellowRatings)
          .set({
            behaviourNotes,
            behaviourRating,
            punctualityNotes,
            punctualityRating,
            programDeliveryNotes,
            programDeliveryRating,
            dressingAndGroomingNotes,
            dressingAndGroomingRating,
          })
          .where(eq(weeklyFellowRatings.id, previousEvaluation.id));
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
  leaderId,
  groupId,
}: {
  leaderId: string;
  groupId: string;
}) {
  try {
    await checkAuth();

    const [updated] = await db
      .update(interventionGroup)
      .set({ leaderId })
      .where(eq(interventionGroup.id, groupId))
      .returning({ groupName: interventionGroup.groupName });
    if (!updated) {
      throw new Error(`Group ${groupId} not found`);
    }
    const leader = await db.query.fellow.findFirst({
      where: (f, { eq }) => eq(f.id, leaderId),
      columns: { fellowName: true },
    });
    return {
      success: true,
      message: `Group ${updated.groupName} successfully assigned to ${leader?.fellowName}`,
    };
  } catch (err) {
    if (isUniqueViolation(err)) {
      const result = await db.query.interventionGroup.findFirst({
        where: (g, { eq }) => eq(g.leaderId, leaderId),
        with: { leader: true },
      });
      if (result) {
        return {
          success: false,
          message: `Sorry, could not replace fellow. ${result.leader.fellowName} is already assigned to group ${result.groupName}`,
        };
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
      const groups = await db.$count(
        interventionGroup,
        and(eq(interventionGroup.leaderId, fellowId), isNull(interventionGroup.archivedAt)),
      );

      if (groups > 0) {
        return {
          success: false,
          message: `Sorry, could not drop out fellow. Fellow is still assigned to ${groups} active groups. Please assign a new leader or archive the groups.`,
        };
      }
    }
    const [result] = await db
      .update(fellow)
      .set({
        droppedOut: mode === "dropout",
        dropOutReason: mode === "dropout" ? dropoutReason : null,
        droppedOutAt: mode === "dropout" ? new Date() : null,
      })
      .where(eq(fellow.id, fellowId))
      .returning({ fellowName: fellow.fellowName });
    if (!result) {
      throw new Error(`Fellow ${fellowId} not found`);
    }

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
    if (!id) {
      throw new Error("Fellow id is required");
    }

    return await db.transaction(async (tx) => {
      const fellowRow = await requireFellow(tx, id);

      const session = await requireSessionWithName(tx, sessionId);

      if (!session.occurred) {
        throw new Error(
          `An error occurred while marking attendance for ${fellowRow.fellowName}. Session has not occurred.`,
        );
      }

      const attendance = await tx.query.fellowAttendance.findFirst({
        where: (a, { and, eq }) => and(eq(a.fellowId, fellowRow.id), eq(a.sessionId, sessionId)),
        with: { session: { with: { session: true } } },
      });

      if (attendance) {
        if (attendance.processedAt !== null) {
          throw new Error(
            `An error occurred while marking attendance for ${fellowRow.fellowName}. Attendance already processed on ${format(attendance.processedAt, "dd-MM-yyyy.")}`,
          );
        }

        let amount = attendance.session?.session?.amount;
        let reason = "MARK_SESSION_ATTENDANCE";
        const attendanceStatus = attendedFlag(attended);

        if (Number.isInteger(amount) && amount) {
          if (!attendanceStatus) {
            amount = -amount;
            reason = "UNMARK_SESSION_ATTENDANCE";
          }

          const existingPayout = await tx.query.payoutStatements.findFirst({
            where: (p, { and, eq }) =>
              and(eq(p.fellowId, fellowRow.id), eq(p.fellowAttendanceId, attendance.id)),
            orderBy: (p, { desc }) => desc(p.createdAt),
          });

          if (
            (!existingPayout && attendanceStatus) ||
            (existingPayout && existingPayout.reason !== reason)
          ) {
            if (!userSession.user.id) {
              throw new Error("User ID is required to create payout statement");
            }

            await tx.insert(payoutStatements).values({
              fellowId: fellowRow.id,
              fellowAttendanceId: attendance.id,
              createdBy: userSession.user.id,
              amount,
              reason,
              mpesaNumber: fellowRow.mpesaNumber,
            });
          }
        } else {
          throw new Error(
            "An error occurred while marking attendance. Session missing payout amount.",
          );
        }

        await tx
          .update(fellowAttendance)
          .set({
            markedBy: userSession.user.id,
            fellowId: fellowRow.id,
            absenceReason: attendanceStatus === false ? absenceReason : null,
            absenceComments: attendanceStatus === false ? comments : null,
            attended: attendanceStatus,
          })
          .where(eq(fellowAttendance.id, attendance.id));

        return {
          success: true,
          message: `Successfully updated attendance for ${fellowRow.fellowName}`,
        };
      }
      let groupId: string | undefined;
      if (session.schoolId) {
        const schoolId = session.schoolId;
        const group = await tx.query.interventionGroup.findFirst({
          where: (g, { and, eq }) => and(eq(g.schoolId, schoolId), eq(g.leaderId, fellowRow.id)),
        });
        if (group) {
          if (group.groupType !== "TREATMENT" && session.session?.sessionType === "INTERVENTION") {
            throw new Error(
              `An error occurred while marking attendance. ${fellowRow.fellowName}'s group is not a treatment group.`,
            );
          }
          groupId = group.id;
        } else {
          throw new Error(
            `An error occurred while marking attendance. ${fellowRow.fellowName} has no assigned group`,
          );
        }
      }

      if (session.session?.amount === undefined || session.session?.amount === null) {
        throw new Error(
          `An error occurred while marking attendance for ${fellowRow.fellowName}. Session payout amount not found.`,
        );
      }

      const attendanceStatus = attendedFlag(attended);

      const projectId = session.projectId;
      if (!projectId) {
        throw new Error(
          "Session has no project. Ensure the session is linked to a hub with a project.",
        );
      }

      const [createdAttendance] = await tx
        .insert(fellowAttendance)
        .values({
          fellowId: fellowRow.id,
          groupId,
          schoolId: session.schoolId,
          projectId,
          sessionId,
          absenceReason,
          absenceComments: comments,
          markedBy: userSession.user.id,
          attended: attendanceStatus,
        })
        .returning({ id: fellowAttendance.id });
      if (!createdAttendance) {
        throw new Error("Could not create the attendance record");
      }
      if (attendanceStatus && userSession.user.id) {
        await tx.insert(payoutStatements).values({
          fellowId: fellowRow.id,
          fellowAttendanceId: createdAttendance.id,
          createdBy: userSession.user.id,
          amount: session.session?.amount ?? 0,
          reason: "MARK_SESSION_ATTENDANCE",
          mpesaNumber: fellowRow.mpesaNumber,
        });
      }
      return {
        success: true,
        message: `Successfully marked attendance for ${fellowRow.fellowName}`,
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

    return await db.transaction(async (tx) => {
      const session = await requireSessionWithName(tx, sessionId);

      if (!session.occurred) {
        throw new Error("An error occurred while marking attendances. Session has not occurred.");
      }

      if (!Number.isInteger(session.session?.amount)) {
        throw new Error(
          "An error occurred while marking attendances. Session payout amount not found.",
        );
      }

      const attendanceStatus = attendedFlag(attended);
      const amount = session.session?.amount ?? 0;

      // update existing attendances
      const attendances = await tx.query.fellowAttendance.findMany({
        where: (a, { and, eq, inArray }) =>
          and(inArray(a.fellowId, ids), eq(a.sessionId, sessionId)),
        with: { fellow: true, PayoutStatements: true },
      });

      const data: {
        payout: typeof payoutStatements.$inferInsert | undefined;
        id: number;
        fellowId: string;
      }[] = [];

      attendances.forEach((attendance) => {
        if (attendance.processedAt !== null) {
          throw new Error(
            `An error occurred while marking attendances. ${attendance.fellow.fellowName}'s attendance has already been processed on ${format(
              attendance.processedAt,
              "dd-MM-yyyy.",
            )}`,
          );
        }

        let reason = "MARK_SESSION_ATTENDANCE";
        let _amount = amount;
        if (!attendanceStatus && amount) {
          _amount = -amount;
          reason = "UNMARK_SESSION_ATTENDANCE";
        }

        const existingPayouts = attendance.PayoutStatements.toSorted((a, b) => {
          return b.createdAt.getTime() - a.createdAt.getTime();
        });

        let payout: typeof payoutStatements.$inferInsert | undefined;
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

      const payoutRows = data
        .map((x) => x.payout)
        .filter((payout): payout is NonNullable<typeof payout> => payout !== undefined);
      if (payoutRows.length > 0) {
        await tx.insert(payoutStatements).values(payoutRows);
      }

      if (data.length > 0) {
        await tx
          .update(fellowAttendance)
          .set({
            absenceReason: attendanceStatus === false ? absenceReason : null,
            absenceComments: attendanceStatus === false ? comments : null,
            attended: attendanceStatus,
          })
          .where(
            inArray(
              fellowAttendance.id,
              data.map((attendance) => attendance.id),
            ),
          );
      }

      // create new attendances
      const fellowIds = ids.filter((fellowId) => {
        return !attendances.some((attendance) => attendance.fellowId === fellowId);
      });

      const fellows = await tx.query.fellow.findMany({
        where: (f, { inArray }) => inArray(f.id, fellowIds),
      });

      let validFellows: Array<{
        fellow: (typeof fellows)[0];
        groupId: string | undefined;
      }> = [];

      if (session.schoolId) {
        const schoolId = session.schoolId;
        const groups = await tx.query.interventionGroup.findMany({
          where: (g, { and, eq, inArray }) =>
            and(eq(g.schoolId, schoolId), inArray(g.leaderId, fellowIds)),
        });

        const groupsByFellowId = new Map(groups.map((group) => [group.leaderId, group]));

        for (const fellowRow of fellows) {
          const group = groupsByFellowId.get(fellowRow.id);

          if (!group) {
            throw new Error(
              `An error occurred while marking attendance. ${fellowRow.fellowName} has no assigned group`,
            );
          }

          if (group.groupType !== "TREATMENT" && session.session?.sessionType === "INTERVENTION") {
            throw new Error(
              `An error occurred while marking attendance. ${fellowRow.fellowName}'s group is not a treatment group.`,
            );
          }

          validFellows.push({ fellow: fellowRow, groupId: group.id });
        }
      } else {
        validFellows = fellows.map((fellowRow) => ({
          fellow: fellowRow,
          groupId: undefined,
        }));
      }

      const projectId = session.projectId;
      if (!projectId) {
        throw new Error(
          "Session has no project. Ensure the session is linked to a hub with a project.",
        );
      }

      const attendanceRows = validFellows.map(({ fellow: fellowRow, groupId }) => ({
        fellowId: fellowRow.id,
        schoolId: session.schoolId,
        groupId,
        projectId,
        absenceReason: attendanceStatus === false ? absenceReason : null,
        absenceComments: attendanceStatus === false ? comments : null,
        sessionId,
        markedBy: userSession.user.id,
        attended: attendanceStatus,
      }));

      const newAttendances =
        attendanceRows.length > 0
          ? await tx
              .insert(fellowAttendance)
              .values(attendanceRows)
              .returning({ id: fellowAttendance.id, fellowId: fellowAttendance.fellowId })
          : [];

      if (attendanceStatus && userSession.user.id) {
        const userId = userSession.user.id;
        const fellowById = new Map(validFellows.map(({ fellow: f }) => [f.id, f]));
        const payoutData = newAttendances.map((attendance) => {
          const fellowRow = fellowById.get(attendance.fellowId);
          return {
            fellowId: attendance.fellowId,
            fellowAttendanceId: attendance.id,
            createdBy: userId,
            amount: amount,
            reason: "MARK_SESSION_ATTENDANCE",
            mpesaNumber: fellowRow?.mpesaNumber ?? null,
          };
        });

        if (payoutData.length > 0) {
          await tx.insert(payoutStatements).values(payoutData);
        }
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
    const [result] = await db
      .insert(fellowComplaints)
      .values({ fellowId: id, complaint, comments, createdBy: userSession.user.id })
      .returning();

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

type FellowGroupStats = {
  group_count: number;
  total_students: number;
  total_sessions: number;
};

export async function getFellowGroupsAndHubData(fellowId: string) {
  if (!fellowId) return null;

  const fellowRow = await db.query.fellow.findFirst({
    where: (f, { eq }) => eq(f.id, fellowId),
    columns: { hubId: true },
    with: { groups: { columns: { id: true, schoolId: true } } },
  });

  if (!fellowRow) return null;

  const { hubId } = fellowRow;
  const fellowGroupIds = fellowRow.groups.map((group) => group.id);
  const fellowSchoolIds = Array.from(new Set(fellowRow.groups.map((group) => group.schoolId)));

  const statsPromise = queryRaw<FellowGroupStats>(sql`
    SELECT
      COUNT(*)::int                 AS group_count,
      COALESCE(SUM(sc.c), 0)::int   AS total_students,
      COALESCE(SUM(ic.c), 0)::int   AS total_sessions
    FROM intervention_groups ig
    LEFT JOIN LATERAL (
      SELECT COUNT(*)::int AS c FROM students
      WHERE assigned_group_id = ig.id
    ) sc ON TRUE
    LEFT JOIN LATERAL (
      SELECT COUNT(*)::int AS c FROM intervention_sessions
      WHERE school_id = ig.school_id
    ) ic ON TRUE
    WHERE ig.leader_id = ${fellowId}
  `);

  const [statsRows, schoolRows, sessions] = await Promise.all([
    statsPromise,
    fellowSchoolIds.length
      ? db.query.school.findMany({
          where: (s, { inArray }) => inArray(s.id, fellowSchoolIds),
          with: {
            assignedSupervisor: true,
            interventionSessions: { with: { sessionRatings: true, session: true } },
            students: {
              where: (st, { inArray }) => inArray(st.assignedGroupId, fellowGroupIds),
              with: { assignedGroup: true },
              extras: (st, { sql }) => ({
                clinicalCasesCount:
                  sql<number>`(select count(*) from (select student_id from clinical_screening_info) c where c.student_id = ${st.id})`
                    .mapWith(Number)
                    .as("clinical_cases_count"),
              }),
            },
          },
        })
      : Promise.resolve([]),
    hubId
      ? db.query.sessionName.findMany({ where: (n, { eq }) => eq(n.hubId, hubId) })
      : Promise.resolve([]),
  ]);

  // Readers still use the `_count` shape; flatten it together with them (ENG-2161).
  const schools = schoolRows.map((s) => ({
    ...s,
    students: s.students.map(({ clinicalCasesCount, ...st }) => ({
      ...st,
      _count: { clinicalCases: clinicalCasesCount },
    })),
  }));

  const stats = statsRows[0] ?? {
    group_count: 0,
    total_students: 0,
    total_sessions: 0,
  };

  return { stats, hub: { schools, sessions } };
}
