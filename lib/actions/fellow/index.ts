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
  requireFellowsInHub,
  requireHubRole,
  requireSchoolInHub,
} from "#/lib/auth/require-hub-role";
import { objectId } from "#/lib/crypto";

const attendedFlag = (attended: string | undefined) =>
  attended === "attended" ? true : attended === "missed" ? false : null;

/**
 * The payout statement an attendance change writes, or undefined when none is due. A statement is
 * written only when the attendance flips: marking when the latest statement is not a mark,
 * unmarking when there is one and it is not an unmark. Marking pays the session's current rate,
 * which can be 0. Unmarking reverses what the attendance has actually been paid, the net of its
 * statements, so a rate change in between cannot leave the fellow over- or underpaid.
 */
function attendancePayoutChange(
  payouts: { amount: number; reason: string; createdAt: Date }[],
  attended: boolean | null,
  currentRate: number,
): { amount: number; reason: string } | undefined {
  const latest = payouts.toSorted((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
  if (attended) {
    if (latest?.reason === "MARK_SESSION_ATTENDANCE") return undefined;
    return { amount: currentRate, reason: "MARK_SESSION_ATTENDANCE" };
  }
  if (!latest || latest.reason === "UNMARK_SESSION_ATTENDANCE") return undefined;
  const paid = payouts.reduce((sum, payout) => sum + payout.amount, 0);
  return { amount: paid === 0 ? 0 : -paid, reason: "UNMARK_SESSION_ATTENDANCE" };
}

/**
 * The rate marking attendance pays: the amount of the session's session type, which can be 0. A
 * session with no session type has no rate, so its attendance can be unmarked but not marked.
 */
function sessionRate(session: { session: { amount: number } | null }) {
  if (!session.session) {
    throw new Error(
      "An error occurred while marking attendance. The session has no session type, so it has no payout amount.",
    );
  }
  return session.session.amount;
}

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
    with: { session: true },
  });
  if (!row || row.hubId !== hubId) {
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
    await requireFellowsInHub([leaderId], caller.hubId);

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
    const { hubId } = await requireHubRole(ImplementerRole.HUB_COORDINATOR);
    await requireFellowsInHub([fellowId], hubId);
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
    await requireFellowsInHub([id], hubId);

    const response = await db.transaction(
      async (tx) => {
        const fellowRow = await requireFellow(tx, id);

        const session = await requireSessionWithName(tx, sessionId, hubId);

        if (!session.occurred) {
          throw new Error(
            `An error occurred while marking attendance for ${fellowRow.fellowName}. Session has not occurred.`,
          );
        }

        const attendance = await tx.query.fellowAttendance.findFirst({
          where: (a, { and, eq }) => and(eq(a.fellowId, fellowRow.id), eq(a.sessionId, sessionId)),
        });

        if (attendance) {
          if (attendance.processedAt !== null) {
            throw new Error(
              `An error occurred while marking attendance for ${fellowRow.fellowName}. Attendance already processed on ${format(attendance.processedAt, "dd-MM-yyyy.")}`,
            );
          }

          const attendanceStatus = attendedFlag(attended);
          // Only marking needs the rate; an unmark reverses what was actually paid.
          const currentRate = attendanceStatus ? sessionRate(session) : 0;

          const payouts = await tx.query.payoutStatements.findMany({
            where: (p, { eq }) => eq(p.fellowAttendanceId, attendance.id),
            columns: { amount: true, reason: true, createdAt: true },
          });
          const payout = attendancePayoutChange(payouts, attendanceStatus, currentRate);
          if (payout) {
            await tx.insert(payoutStatements).values({
              fellowAttendanceId: attendance.id,
              createdBy: userId,
              mpesaNumber: fellowRow.mpesaNumber,
              ...payout,
            });
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

        const attendanceStatus = attendedFlag(attended);
        const rate = attendanceStatus ? sessionRate(session) : 0;

        if (!session.projectId) {
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
            fellowAttendanceId: createdAttendance.id,
            createdBy: userId,
            amount: rate,
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
    await requireFellowsInHub(ids, hubId);

    const response = await db.transaction(
      async (tx) => {
        const session = await requireSessionWithName(tx, sessionId, hubId);

        if (!session.occurred) {
          throw new Error("An error occurred while marking attendances. Session has not occurred.");
        }

        const attendanceStatus = attendedFlag(attended);
        const rate = attendanceStatus ? sessionRate(session) : 0;

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

          const change = attendancePayoutChange(
            attendance.PayoutStatements,
            attendanceStatus,
            rate,
          );
          const payout: typeof payoutStatements.$inferInsert | undefined = change && {
            fellowAttendanceId: attendance.id,
            createdBy: userId,
            mpesaNumber: attendance.fellow.mpesaNumber,
            ...change,
          };

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

        if (!session.projectId) {
          throw new Error(
            "Session has no project. Ensure the session is linked to a hub with a project.",
          );
        }

        const attendanceRows = validFellows.map(({ fellow: fellowRow, groupId }) => ({
          fellowId: fellowRow.id,
          schoolId: session.schoolId,
          groupId,
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
              fellowAttendanceId: attendance.id,
              createdBy: userId,
              amount: rate,
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
    const caller = await requireHubRole(
      ImplementerRole.SUPERVISOR,
      ImplementerRole.HUB_COORDINATOR,
    );
    await requireFellowsInHub([id], caller.hubId);
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
      with: { groups: { columns: { schoolId: true } } },
    }),
    fellowGroupStats(fellowId),
  ]);

  if (!fellowRow) return null;

  const { hubId } = fellowRow;
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
          },
        })
      : Promise.resolve([]),
    hubId
      ? db.query.sessionName.findMany({ where: (n, { eq }) => eq(n.hubId, hubId) })
      : Promise.resolve([]),
  ]);

  return { stats, hub: { schools: schoolRows, sessions } };
}
