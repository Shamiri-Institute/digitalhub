"use server";

import { and, eq, inArray } from "drizzle-orm";
import { refresh } from "next/cache";
import type { z } from "zod";

import {
  ArchiveStudentSchema,
  DropoutStudentSchema,
  MarkAttendanceSchema,
  StudentReportingNotesSchema,
} from "#/app/(platform)/hc/schemas";
import { currentHubCoordinator } from "#/app/auth";
import {
  MoveStudentToSchoolSchema,
  StudentDetailsSchema,
} from "#/components/common/student/schemas";
import { db } from "#/db/client";
import { ImplementerRole } from "#/db/enums";
import {
  interventionGroup,
  school,
  student,
  studentAttendance,
  studentGroupTransferTrail,
  studentReportingNotes,
} from "#/db/schema";
import { fetchSessionAttendances } from "#/lib/actions/session/session";
import { requireAuthRole } from "#/lib/auth/require-auth-role";
import { requireHubRole, requireSchoolInHub } from "#/lib/auth/require-hub-role";
import { objectId } from "#/lib/crypto";
import { generateStudentVisibleID } from "#/lib/utils";

type StudentRole =
  | typeof ImplementerRole.FELLOW
  | typeof ImplementerRole.SUPERVISOR
  | typeof ImplementerRole.HUB_COORDINATOR;

/**
 * The caller and the student, after checking the caller may change the student: a fellow only the
 * students of the groups they lead, a supervisor or hub coordinator the students of their hub's
 * schools. These are the students each role's pages list.
 */
async function requireStudentAccess(studentId: string, ...roles: StudentRole[]) {
  const caller = await requireHubRole(...roles);
  const targetStudent = await db.query.student.findFirst({
    where: (s, { eq }) => eq(s.id, studentId),
    columns: { id: true, schoolId: true },
    with: {
      school: { columns: { hubId: true } },
      assignedGroup: { columns: { leaderId: true } },
    },
  });
  const callerMayChangeStudent =
    caller.role === ImplementerRole.FELLOW
      ? targetStudent?.assignedGroup?.leaderId === caller.profileId
      : targetStudent?.school?.hubId === caller.hubId;
  if (!targetStudent || !callerMayChangeStudent) {
    throw new Error("Student not found");
  }
  return { caller, student: targetStudent };
}

const STUDENT_WRITE_ROLES = [
  ImplementerRole.FELLOW,
  ImplementerRole.SUPERVISOR,
  ImplementerRole.HUB_COORDINATOR,
] as const;

/**
 * Throws unless the caller works at the school: a fellow leads a group there (hubs borrow fellows,
 * so their own hub can differ), a supervisor or hub coordinator has the school in their hub.
 */
async function requireCallerAtSchool(
  caller: Awaited<ReturnType<typeof requireHubRole>>,
  schoolId: string,
) {
  if (caller.role !== ImplementerRole.FELLOW) {
    await requireSchoolInHub(schoolId, caller.hubId);
    return;
  }
  const ledGroup = await db.query.interventionGroup.findFirst({
    where: (g, { and, eq }) => and(eq(g.schoolId, schoolId), eq(g.leaderId, caller.profileId)),
    columns: { id: true },
  });
  if (!ledGroup) {
    throw new Error("School not found");
  }
}

const attendedFlag = (attended: string | undefined) =>
  attended === "attended" ? true : attended === "missed" ? false : null;

async function requireSession(sessionId: string) {
  const session = await db.query.interventionSession.findFirst({
    where: (s, { eq }) => eq(s.id, sessionId),
  });
  if (!session) {
    throw new Error(`Intervention session ${sessionId} not found`);
  }
  return session;
}

export async function submitStudentDetails(data: z.infer<typeof StudentDetailsSchema>) {
  // TODO: Add db transactions
  try {
    const { implementerId } = await requireAuthRole(...STUDENT_WRITE_ROLES);

    const {
      id,
      studentName,
      form,
      stream,
      gender,
      yearOfBirth,
      admissionNumber,
      phoneNumber,
      questionnaireType,
      mode,
      assignedGroupId,
      schoolId,
    } = StudentDetailsSchema.parse(data);

    if (mode === "edit") {
      if (!id) {
        throw new Error("Student id is required to edit a student");
      }
      await requireStudentAccess(id, ...STUDENT_WRITE_ROLES);
      const updated = await db
        .update(student)
        .set({
          studentName,
          gender,
          yearOfBirth: Number(yearOfBirth),
          form: Number(form),
          stream,
          phoneNumber,
          admissionNumber,
          questionnaireType:
            questionnaireType === "none" || questionnaireType == null ? null : questionnaireType,
        })
        .where(eq(student.id, id))
        .returning({ id: student.id });
      if (updated.length === 0) {
        throw new Error(`Student ${id} not found`);
      }
      refresh();
      return {
        success: true,
        message: `Successfully updated details for ${studentName}`,
      };
    }
    if (!assignedGroupId || !schoolId) {
      throw new Error("A group and a school are required to add a student");
    }
    const caller = await requireHubRole(...STUDENT_WRITE_ROLES);
    await requireCallerAtSchool(caller, schoolId);
    const [group, schoolRow, studentCount] = await Promise.all([
      db.query.interventionGroup.findFirst({
        where: (g, { eq }) => eq(g.id, assignedGroupId),
        with: { leader: { with: { supervisor: true } } },
      }),
      db.query.school.findFirst({
        where: (s, { eq }) => eq(s.id, schoolId),
      }),
      db.$count(student),
    ]);
    const callerMayUseGroup =
      group?.schoolId === schoolId &&
      (caller.role !== ImplementerRole.FELLOW || group.leaderId === caller.profileId);
    if (!group || !callerMayUseGroup) {
      throw new Error(`Group ${assignedGroupId} not found`);
    }
    if (!schoolRow) {
      throw new Error(`School ${schoolId} not found`);
    }

    const [created] = await db
      .insert(student)
      .values({
        id: objectId("stu"),
        visibleId: generateStudentVisibleID(group?.groupName ?? "NA", studentCount),
        studentName,
        schoolId: schoolRow.id,
        admissionNumber,
        yearOfBirth: Number(yearOfBirth),
        gender,
        form: Number(form),
        stream,
        questionnaireType:
          questionnaireType === "none" || questionnaireType == null ? null : questionnaireType,
        assignedGroupId,
        implementerId,
        fellowId: group.leader.id,
        supervisorId: group.leader.supervisor?.id,
      })
      .returning();
    if (!created) {
      throw new Error("Could not create the student");
    }
    refresh();

    return {
      success: true,
      message: `Successfully added ${created.studentName} to group ${group.groupName}`,
      data: created,
    };
  } catch (err) {
    console.error(err);
    return {
      success: false,
      message: (err as Error)?.message ?? "Sorry, could not update student information.",
    };
  }
}

export async function markStudentAttendance(data: z.infer<typeof MarkAttendanceSchema>) {
  try {
    const { userId } = await requireAuthRole(...STUDENT_WRITE_ROLES);

    const { id, sessionId, absenceReason, attended, comments } = MarkAttendanceSchema.parse(data);

    const session = await requireSession(sessionId);

    if (!session.occurred) {
      return {
        success: false,
        message: "This session has not occurred yet.",
      };
    }

    if (!id) {
      throw new Error("Student id is required");
    }
    await requireStudentAccess(id, ...STUDENT_WRITE_ROLES);
    const studentRow = await db.query.student.findFirst({
      where: (s, { eq }) => eq(s.id, id),
      with: { assignedGroup: true },
    });
    if (!studentRow || studentRow.schoolId !== session.schoolId) {
      throw new Error(`Student ${id} not found`);
    }

    if (!studentRow.assignedGroup) {
      return {
        success: false,
        message: `${studentRow.studentName} has not been assigned to a group.`,
      };
    }

    const status = attendedFlag(attended);
    await db
      .insert(studentAttendance)
      .values({
        studentId: studentRow.id,
        schoolId: studentRow.schoolId,
        projectId: studentRow.assignedGroup.projectId,
        absenceReason,
        comments,
        sessionId,
        groupId: studentRow.assignedGroup.id,
        fellowId: studentRow.assignedGroup.leaderId,
        markedBy: userId,
        attended: status,
      })
      .onConflictDoUpdate({
        target: [studentAttendance.studentId, studentAttendance.sessionId],
        set: {
          markedBy: userId,
          studentId: studentRow.id,
          absenceReason,
          comments,
          attended: status,
        },
      });
    refresh();
    return {
      success: true,
      message: `Successfully marked attendance for ${studentRow.studentName}`,
      attendances: await fetchSessionAttendances(sessionId),
    };
  } catch (err) {
    console.error(err);
    return {
      success: false,
      message:
        (err as Error)?.message ?? "Sorry, an error occurred while marking student attendance.",
    };
  }
}

export async function markManyStudentsAttendance(
  ids: string[],
  data: z.infer<typeof MarkAttendanceSchema>,
) {
  try {
    const { userId } = await requireAuthRole(...STUDENT_WRITE_ROLES);

    const { sessionId, absenceReason, attended, comments } = MarkAttendanceSchema.parse(data);

    const session = await requireSession(sessionId);

    if (!session.occurred) {
      return {
        success: false,
        message: "This session has not occurred yet.",
      };
    }

    const caller = await requireHubRole(...STUDENT_WRITE_ROLES);
    const uniqueIds = [...new Set(ids)];
    const studentsInCallerScope =
      session.schoolId === null || uniqueIds.length === 0
        ? []
        : await db
            .select({ id: student.id })
            .from(student)
            .innerJoin(school, eq(school.id, student.schoolId))
            .leftJoin(interventionGroup, eq(interventionGroup.id, student.assignedGroupId))
            .where(
              and(
                inArray(student.id, uniqueIds),
                eq(student.schoolId, session.schoolId),
                caller.role === ImplementerRole.FELLOW
                  ? eq(interventionGroup.leaderId, caller.profileId)
                  : eq(school.hubId, caller.hubId),
              ),
            );
    if (studentsInCallerScope.length !== uniqueIds.length) {
      throw new Error("Student not found");
    }

    const status = attendedFlag(attended);

    await db.transaction(async (tx) => {
      // Create new attendance records
      const attendances = await tx.query.studentAttendance.findMany({
        where: (a, { and, eq, inArray }) =>
          and(inArray(a.studentId, ids), eq(a.sessionId, sessionId)),
        columns: { studentId: true },
      });

      const studentIds = ids.filter((id) => {
        return !attendances.map((x) => x.studentId).includes(id);
      });

      const students = await tx.query.student.findMany({
        where: (s, { and, inArray, isNull }) =>
          and(isNull(s.archivedAt), inArray(s.id, studentIds)),
        with: { assignedGroup: true },
      });

      const createRecords: (typeof studentAttendance.$inferInsert)[] = [];

      students.forEach((row) => {
        if (!row.assignedGroup) {
          throw new Error(`${row.studentName} has not been assigned to a group.`);
        }

        createRecords.push({
          studentId: row.id,
          schoolId: row.schoolId,
          projectId: row.assignedGroup.projectId,
          absenceReason,
          comments,
          sessionId,
          groupId: row.assignedGroup.id,
          fellowId: row.assignedGroup.leaderId,
          markedBy: userId,
          attended: status,
        });
      });

      if (createRecords.length > 0) {
        await tx.insert(studentAttendance).values(createRecords);
      }

      // Update existing attendances
      await tx
        .update(studentAttendance)
        .set({
          markedBy: userId,
          absenceReason: status === null || status ? null : absenceReason,
          comments: status === null || status ? null : comments,
          attended: status,
        })
        .where(
          and(
            inArray(studentAttendance.studentId, ids),
            eq(studentAttendance.sessionId, sessionId),
          ),
        );
    });
    refresh();
    return {
      success: true,
      message: `Successfully marked attendance for ${ids.length} students`,
      attendances: await fetchSessionAttendances(sessionId),
    };
  } catch (err) {
    console.error(err);
    return {
      success: false,
      message:
        (err as Error)?.message ?? "Sorry, an error occurred while marking student attendance.",
    };
  }
}

export async function dropoutStudent(data: z.infer<typeof DropoutStudentSchema>) {
  try {
    const { studentId, mode, dropoutReason } = DropoutStudentSchema.parse(data);
    await requireStudentAccess(
      studentId,
      ImplementerRole.FELLOW,
      ImplementerRole.SUPERVISOR,
      ImplementerRole.HUB_COORDINATOR,
    );
    const [result] = await db
      .update(student)
      .set({
        droppedOut: mode === "dropout",
        dropOutReason: mode === "dropout" ? dropoutReason : null,
        droppedOutAt: mode === "dropout" ? new Date() : null,
      })
      .where(eq(student.id, studentId))
      .returning({ studentName: student.studentName });
    if (!result) {
      throw new Error(`Student ${studentId} not found`);
    }
    refresh();

    return {
      success: true,
      message:
        mode === "dropout"
          ? `${result.studentName} successfully dropped out.`
          : `${result.studentName} successfully un-dropped.`,
    };
  } catch (e) {
    console.error(e);
    return {
      success: false,
      message: `Something went wrong while trying to ${data.mode === "dropout" ? "drop out student" : "undo drop out"}`,
    };
  }
}

export async function archiveStudent(data: z.infer<typeof ArchiveStudentSchema>) {
  try {
    const { studentId } = ArchiveStudentSchema.parse(data);
    // Only hub coordinators see "Archive student" in the UI.
    await requireStudentAccess(studentId, ImplementerRole.HUB_COORDINATOR);
    const [result] = await db
      .update(student)
      .set({ archivedAt: new Date() })
      .where(eq(student.id, studentId))
      .returning({ studentName: student.studentName });
    if (!result) {
      throw new Error(`Student ${studentId} not found`);
    }
    refresh();

    return {
      success: true,
      message: `${result.studentName} has been archived.`,
    };
  } catch (e) {
    console.error(e);
    return {
      success: false,
      message: "Something went wrong while trying to archive student.",
    };
  }
}

export async function submitStudentReportingNotes(
  data: z.infer<typeof StudentReportingNotesSchema>,
) {
  try {
    const { studentId, notes } = StudentReportingNotesSchema.parse(data);
    const { caller } = await requireStudentAccess(
      studentId,
      ImplementerRole.FELLOW,
      ImplementerRole.SUPERVISOR,
      ImplementerRole.HUB_COORDINATOR,
    );

    await db.insert(studentReportingNotes).values({ studentId, notes, addedBy: caller.userId });
    refresh();
    return {
      success: true,
      message: "Successfully submitted reporting notes",
    };
  } catch (err) {
    console.error(err);
    return {
      success: false,
      message: (err as Error)?.message ?? "Sorry, could not submit reporting notes.",
    };
  }
}

export async function checkExistingStudents(admissionNumber: string, schoolId: string) {
  const caller = await requireHubRole(...STUDENT_WRITE_ROLES);
  await requireCallerAtSchool(caller, schoolId);
  return db.query.student.findMany({
    where: (s, { and, eq, isNull }) =>
      and(isNull(s.archivedAt), eq(s.admissionNumber, admissionNumber), eq(s.schoolId, schoolId)),
    with: {
      assignedGroup: { with: { leader: { columns: { id: true, fellowName: true } } } },
    },
  });
}

export async function transferStudentToGroup(id: string, groupId: string) {
  try {
    // The student usually sits in someone else's group (a fellow pulls a matched student into
    // their own), so the check is on the target group: it must be in the student's school and,
    // for a fellow, be one they lead.
    const caller = await requireHubRole(
      ImplementerRole.FELLOW,
      ImplementerRole.SUPERVISOR,
      ImplementerRole.HUB_COORDINATOR,
    );
    const [targetGroup, studentToMove] = await Promise.all([
      db.query.interventionGroup.findFirst({
        where: (g, { eq }) => eq(g.id, groupId),
        columns: { groupName: true, schoolId: true, leaderId: true },
        with: { school: { columns: { hubId: true } } },
      }),
      db.query.student.findFirst({
        where: (s, { eq }) => eq(s.id, id),
        columns: { schoolId: true },
      }),
    ]);
    const callerMayUseGroup =
      targetGroup !== undefined &&
      studentToMove?.schoolId === targetGroup.schoolId &&
      (caller.role === ImplementerRole.FELLOW
        ? targetGroup.leaderId === caller.profileId
        : targetGroup.school.hubId === caller.hubId);
    if (!callerMayUseGroup) {
      throw new Error("Student or group not found");
    }

    const [updated] = await db
      .update(student)
      .set({ assignedGroupId: groupId })
      .where(eq(student.id, id))
      .returning({ studentName: student.studentName });
    if (!updated) {
      throw new Error(`Student ${id} not found`);
    }
    refresh();

    return {
      success: true,
      message: `Successfully transferred ${updated.studentName} to group ${targetGroup.groupName}`,
    };
  } catch {
    return { error: "Something went wrong while adding student to the group." };
  }
}

export async function getSchoolGroupsForStudentTransfer(schoolId: string) {
  const hubCoordinator = await currentHubCoordinator();
  const hubId = hubCoordinator?.profile?.assignedHubId;
  if (!hubId) {
    return [];
  }

  return db.query.interventionGroup.findMany({
    where: (g, { and, eq, inArray, isNull }) =>
      and(
        eq(g.schoolId, schoolId),
        isNull(g.archivedAt),
        inArray(
          g.schoolId,
          db.select({ id: school.id }).from(school).where(eq(school.hubId, hubId)),
        ),
      ),
    columns: { id: true, groupName: true },
    with: { leader: { columns: { id: true, fellowName: true } } },
    orderBy: (g, { asc }) => asc(g.groupName),
  });
}

export async function moveStudentToSchool(data: z.infer<typeof MoveStudentToSchoolSchema>) {
  try {
    const hubCoordinator = await currentHubCoordinator();
    const hubId = hubCoordinator?.profile?.assignedHubId;
    if (!hubId) {
      throw new Error("You are not authorized to move students between schools.");
    }

    const { studentId, schoolId, assignedGroupId } = MoveStudentToSchoolSchema.parse(data);

    const studentRow = await db.query.student.findFirst({
      where: (s, { eq }) => eq(s.id, studentId),
      columns: { id: true, studentName: true, schoolId: true, assignedGroupId: true },
      with: { school: { columns: { hubId: true } } },
    });
    // The target group is checked against the hub below; the student must come from it too.
    if (!studentRow || studentRow.school?.hubId !== hubId) {
      throw new Error(`Student ${studentId} not found`);
    }

    if (studentRow.schoolId === schoolId) {
      return {
        success: false,
        message: "This student already belongs to the selected school.",
      };
    }

    const group = await db.query.interventionGroup.findFirst({
      where: (g, { and, eq, inArray }) =>
        and(
          eq(g.id, assignedGroupId),
          eq(g.schoolId, schoolId),
          inArray(
            g.schoolId,
            db.select({ id: school.id }).from(school).where(eq(school.hubId, hubId)),
          ),
        ),
      with: {
        school: { columns: { id: true, schoolName: true } },
        leader: {
          columns: { id: true, fellowName: true },
          with: { supervisor: { columns: { id: true } } },
        },
      },
    });
    if (!group) {
      throw new Error(`Group ${assignedGroupId} not found in the selected school`);
    }

    await db.transaction(async (tx) => {
      await tx.delete(studentAttendance).where(eq(studentAttendance.studentId, studentRow.id));

      await tx
        .update(student)
        .set({
          schoolId: group.school.id,
          assignedGroupId: group.id,
          fellowId: group.leader.id,
          supervisorId: group.leader.supervisor?.id ?? null,
        })
        .where(eq(student.id, studentRow.id));

      await tx.insert(studentGroupTransferTrail).values({
        studentId: studentRow.id,
        currentGroupId: group.id,
        fromGroupId: studentRow.assignedGroupId,
      });
    });
    refresh();

    return {
      success: true,
      message: `Successfully moved ${studentRow.studentName} to ${group.school.schoolName} (${group.leader.fellowName} · ${group.groupName})`,
    };
  } catch (err) {
    console.error(err);
    return {
      success: false,
      message:
        (err as Error)?.message ?? "Sorry, could not move the student to the selected school.",
    };
  }
}
