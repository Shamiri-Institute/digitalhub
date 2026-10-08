"use server";

import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { format } from "date-fns";
import type { z } from "zod";
import { refresh } from "next/cache";

import { FellowDetailsSchema, MarkAttendanceSchema } from "#/app/(platform)/hc/schemas";
import { currentFellow } from "#/app/auth";
import {
  DropoutFellowSchema,
  WeeklyFellowEvaluationSchema,
} from "#/components/common/fellow/schema";
import { SubmitComplaintSchema } from "#/components/common/schemas";
import { db, isSerializationFailure, isUniqueViolation, type Transaction } from "#/db/client";
import { ImplementerRole } from "#/db/enums";
import {
  fellow,
  fellowAttendance,
  fellowComplaints,
  implementerMember,
  interventionGroup,
  interventionSessionRating,
  payoutStatements,
  user,
  weeklyFellowRatings,
} from "#/db/schema";
import { countOf } from "#/db/sql";
import { requireAuthRole } from "#/lib/auth/require-auth-role";
import {
  fellowsInCallerScope,
  hubOfSession,
  requireHubRole,
  requireSchoolInHub,
} from "#/lib/auth/require-hub-role";
import { objectId } from "#/lib/crypto";

const attendedFlag = (attended: string | undefined) =>
  attended === "attended" ? true : attended === "missed" ? false : null;

async function requireFellow(tx: Transaction | typeof db, id: string) {
  const row = await tx.query.fellow.findFirst({ where: (f, { eq }) => eq(f.id, id) });
  if (!row) {
    throw new Error(`Fellow ${id} not found`);
  }
  return row;
}

async function requireSessionWithName(tx: Transaction, sessionId: string, hubId: string) {
  const row = await tx.query.interventionSession.findFirst({
    where: (s, { eq }) => eq(s.id, sessionId),
    with: { session: true, school: { columns: { hubId: true } } },
  });
  if (!row || hubOfSession(row) !== hubId) {
    throw new Error(`Intervention session ${sessionId} not found`);
  }
  return row;
}

export async function submitFellowDetails(data: z.infer<typeof FellowDetailsSchema>) {
  try {
    const caller = await requireHubRole(
      ImplementerRole.SUPERVISOR,
      ImplementerRole.HUB_COORDINATOR,
    );

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
      const [fellowInCallerScope] = await db
        .select({ id: fellow.id })
        .from(fellow)
        .where(and(eq(fellow.id, id), inArray(fellow.id, fellowsInCallerScope(caller))));
      if (!fellowInCallerScope) {
        throw new Error("Fellow not found");
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

      await db.transaction(async (tx) => {
        const updated = await tx
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

        const updatedUsers = await tx
          .update(user)
          .set({ email: fellowEmail })
          .where(eq(user.id, fellowMember.userId))
          .returning({ id: user.id });
        if (updatedUsers.length === 0) {
          throw new Error(`User ${fellowMember.userId} not found`);
        }
      });

      refresh();
      return {
        success: true,
        message: `Successfully updated details for ${fellowName}`,
      };
    }
    if (mode === "add") {
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

      const supervisorId =
        caller.role === ImplementerRole.SUPERVISOR ? caller.profileId : undefined;

      await db.transaction(async (tx) => {
        const [created] = await tx
          .insert(fellow)
          .values({
            id: objectId("fellow"),
            hubId: caller.hubId,
            supervisorId,
            implementerId: caller.implementerId,
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
          implementerId: caller.implementerId,
          userId,
          role: "FELLOW",
          identifier: created.id,
        });

        return created;
      });
      refresh();
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
    const { identifier: supervisorId } = await requireAuthRole(ImplementerRole.SUPERVISOR);
    if (!supervisorId) {
      throw new Error("Supervisor id is required to submit an evaluation");
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

      if (fellowRow.supervisorId === supervisorId) {
        const previousEvaluation = await db.query.weeklyFellowRatings.findFirst({
          where: (w, { and, eq }) =>
            and(
              eq(w.fellowId, fellowId),
              eq(w.supervisorId, supervisorId),
              eq(w.week, new Date(week)),
            ),
        });

        if (previousEvaluation === undefined) {
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
          refresh();
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
        refresh();
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

/** The caller, after checking the fellow belongs to their hub, which is how hub pages list fellows. */
async function requireFellowInHub(
  fellowId: string,
  ...roles: (typeof ImplementerRole.SUPERVISOR | typeof ImplementerRole.HUB_COORDINATOR)[]
) {
  const caller = await requireHubRole(...roles);
  const fellowInHub = await db.query.fellow.findFirst({
    where: (f, { and, eq }) => and(eq(f.id, fellowId), eq(f.hubId, caller.hubId)),
    columns: { id: true },
  });
  if (!fellowInHub) {
    throw new Error("Fellow not found");
  }
  return caller;
}

export async function replaceGroupLeader({
  leaderId,
  groupId,
}: {
  leaderId: string;
  groupId: string;
}) {
  try {
    const caller = await requireHubRole(
      ImplementerRole.SUPERVISOR,
      ImplementerRole.HUB_COORDINATOR,
    );
    const groupToReassign = await db.query.interventionGroup.findFirst({
      where: (g, { eq }) => eq(g.id, groupId),
      columns: { schoolId: true },
    });
    await requireSchoolInHub(groupToReassign?.schoolId, caller.hubId);

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
    refresh();
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
    const { fellowId, mode, dropoutReason } = DropoutFellowSchema.parse(data);
    // Only the hub coordinator's fellows table offers this.
    await requireFellowInHub(fellowId, ImplementerRole.HUB_COORDINATOR);
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

    refresh();
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

/**
 * Fellow attendance creates payout statements, so a supervisor or hub coordinator may mark only
 * fellows in their own hub. A missing and a forbidden fellow give the same error.
 */
async function requireFellowsInCallerHub(hubId: string, fellowIds: string[]) {
  const uniqueIds = [...new Set(fellowIds)];
  const inHub =
    uniqueIds.length === 0
      ? []
      : await db
          .select({ id: fellow.id })
          .from(fellow)
          .where(and(inArray(fellow.id, uniqueIds), eq(fellow.hubId, hubId)));
  if (inHub.length !== uniqueIds.length) {
    throw new Error("Fellow not found in your hub");
  }
  return hubId;
}

export async function markFellowAttendance(data: z.infer<typeof MarkAttendanceSchema>) {
  try {
    const { userId, hubId } = await requireHubRole(
      ImplementerRole.SUPERVISOR,
      ImplementerRole.HUB_COORDINATOR,
    );

    const { id, sessionId, absenceReason, attended, comments } = MarkAttendanceSchema.parse(data);
    if (!id) {
      throw new Error("Fellow id is required");
    }
    const callerHubId = await requireFellowsInCallerHub(hubId, [id]);

    const response = await db.transaction(
      async (tx) => {
        const fellowRow = await requireFellow(tx, id);

        const session = await requireSessionWithName(tx, sessionId, callerHubId);

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
              await tx.insert(payoutStatements).values({
                fellowId: fellowRow.id,
                fellowAttendanceId: attendance.id,
                createdBy: userId,
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
              markedBy: userId,
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
            if (
              group.groupType !== "TREATMENT" &&
              session.session?.sessionType === "INTERVENTION"
            ) {
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
            markedBy: userId,
            attended: attendanceStatus,
          })
          .returning({ id: fellowAttendance.id });
        if (!createdAttendance) {
          throw new Error("Could not create the attendance record");
        }
        if (attendanceStatus) {
          await tx.insert(payoutStatements).values({
            fellowId: fellowRow.id,
            fellowAttendanceId: createdAttendance.id,
            createdBy: userId,
            amount: session.session?.amount ?? 0,
            reason: "MARK_SESSION_ATTENDANCE",
            mpesaNumber: fellowRow.mpesaNumber,
          });
        }
        return {
          success: true,
          message: `Successfully marked attendance for ${fellowRow.fellowName}`,
        };
      },
      { isolationLevel: "serializable" },
    );
    refresh();
    return response;
  } catch (err) {
    console.error(err);
    if (isSerializationFailure(err) || isUniqueViolation(err)) {
      return {
        success: false,
        message:
          "Someone else marked this attendance at the same time. Please refresh and try again.",
      };
    }
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
    const { userId, hubId } = await requireHubRole(
      ImplementerRole.SUPERVISOR,
      ImplementerRole.HUB_COORDINATOR,
    );

    const { sessionId, absenceReason, attended, comments } = MarkAttendanceSchema.parse(data);
    const callerHubId = await requireFellowsInCallerHub(hubId, ids);

    const response = await db.transaction(
      async (tx) => {
        const session = await requireSessionWithName(tx, sessionId, callerHubId);

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

        const attendances = await tx.query.fellowAttendance.findMany({
          where: (a, { and, eq, inArray }) =>
            and(inArray(a.fellowId, ids), eq(a.sessionId, sessionId)),
          with: { fellow: true, PayoutStatements: true },
        });

        const data = attendances.map((attendance) => {
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
            amount
          ) {
            payout = {
              fellowId: attendance.fellow.id,
              fellowAttendanceId: attendance.id,
              createdBy: userId,
              amount: _amount,
              reason,
              mpesaNumber: attendance.fellow.mpesaNumber,
            };
          }

          return {
            payout,
            id: attendance.id,
            fellowId: attendance.fellow.id,
          };
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

            if (
              group.groupType !== "TREATMENT" &&
              session.session?.sessionType === "INTERVENTION"
            ) {
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
          markedBy: userId,
          attended: attendanceStatus,
        }));

        const newAttendances =
          attendanceRows.length > 0
            ? await tx
                .insert(fellowAttendance)
                .values(attendanceRows)
                .returning({ id: fellowAttendance.id, fellowId: fellowAttendance.fellowId })
            : [];

        if (attendanceStatus) {
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
      },
      { isolationLevel: "serializable" },
    );
    refresh();
    return response;
  } catch (err) {
    console.error(err);
    if (isSerializationFailure(err) || isUniqueViolation(err)) {
      return {
        success: false,
        message:
          "Someone else marked this attendance at the same time. Please refresh and try again.",
      };
    }
    return {
      success: false,
      message: (err as Error)?.message ?? "An error occurred while marking attendances.",
    };
  }
}

export async function submitFellowComplaint(data: z.infer<typeof SubmitComplaintSchema>) {
  try {
    const { id, complaint, comments } = SubmitComplaintSchema.parse(data);
    // No hub check on the fellow: hubs borrow fellows from each other.
    const caller = await requireHubRole(
      ImplementerRole.SUPERVISOR,
      ImplementerRole.HUB_COORDINATOR,
    );
    const [result] = await db
      .insert(fellowComplaints)
      .values({ fellowId: id, complaint, comments, createdBy: caller.userId })
      .returning();

    refresh();
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

async function fellowGroupStats(fellowId: string) {
  const { rows } = await db.execute<FellowGroupStats>(sql`
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
  return rows[0] ?? { group_count: 0, total_students: 0, total_sessions: 0 };
}

/** Group, student and session counts of the signed-in fellow's groups. */
export async function getFellowGroupStats() {
  const fellowId = (await currentFellow())?.profile.id;
  return fellowId ? fellowGroupStats(fellowId) : null;
}

export async function getFellowGroupsAndHubData() {
  const fellowId = (await currentFellow())?.profile.id;
  if (!fellowId) return null;

  const [fellowRow, stats] = await Promise.all([
    db.query.fellow.findFirst({
      where: (f, { eq }) => eq(f.id, fellowId),
      columns: { hubId: true },
      with: { groups: { columns: { id: true, schoolId: true } } },
    }),
    fellowGroupStats(fellowId),
  ]);

  if (!fellowRow) return null;

  const { hubId } = fellowRow;
  const fellowGroupIds = fellowRow.groups.map((group) => group.id);
  const fellowSchoolIds = Array.from(new Set(fellowRow.groups.map((group) => group.schoolId)));

  const [schoolRows, sessions] = await Promise.all([
    fellowSchoolIds.length
      ? db.query.school.findMany({
          where: (s, { inArray }) => inArray(s.id, fellowSchoolIds),
          with: {
            assignedSupervisor: true,
            interventionSessions: {
              with: { session: true },
              extras: (session) => ({
                sessionRatingsCount: countOf(interventionSessionRating.sessionId, session.id).as(
                  "session_ratings_count",
                ),
              }),
            },
            students: {
              where: (st, { inArray }) => inArray(st.assignedGroupId, fellowGroupIds),
              with: { assignedGroup: true },
              extras: (st, { sql }) => ({
                clinicalCasesCount:
                  sql<number>`(select count(*)::int from (select student_id from clinical_screening_info) c where c.student_id = ${st.id})`.as(
                    "clinical_cases_count",
                  ),
              }),
            },
          },
        })
      : Promise.resolve([]),
    hubId
      ? db.query.sessionName.findMany({ where: (n, { eq }) => eq(n.hubId, hubId) })
      : Promise.resolve([]),
  ]);

  return { stats, hub: { schools: schoolRows, sessions } };
}
