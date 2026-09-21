"use server";

import { and, eq, inArray } from "drizzle-orm";
import type { z } from "zod";

import {
  ArchiveStudentSchema,
  DropoutStudentSchema,
  MarkAttendanceSchema,
  StudentReportingNotesSchema,
} from "#/app/(platform)/hc/schemas";
import { currentHubCoordinator, getCurrentPersonnel } from "#/app/auth";
import {
  MoveStudentToSchoolSchema,
  StudentDetailsSchema,
} from "#/components/common/student/schemas";
import { db } from "#/db/client";
import {
  school,
  student,
  studentAttendance,
  studentGroupTransferTrail,
  studentReportingNotes,
} from "#/db/schema";
import { objectId } from "#/lib/crypto";
import { generateStudentVisibleID } from "#/lib/utils";

async function checkAuth() {
  const user = await getCurrentPersonnel();
  if (user === null) {
    throw new Error("The session has not been authenticated");
  }
  return user;
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
    const auth = await checkAuth();
    const userId = auth.session.user.id;
    if (!userId) {
      throw new Error("The session has not been authenticated");
    }

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
      return {
        success: true,
        message: `Successfully updated details for ${studentName}`,
      };
    }
    if (!assignedGroupId || !schoolId) {
      throw new Error("A group and a school are required to add a student");
    }
    const group = await db.query.interventionGroup.findFirst({
      where: (g, { eq }) => eq(g.id, assignedGroupId),
      with: { leader: { with: { supervisor: true } } },
    });
    if (!group) {
      throw new Error(`Group ${assignedGroupId} not found`);
    }
    const schoolRow = await db.query.school.findFirst({
      where: (s, { eq }) => eq(s.id, schoolId),
    });
    if (!schoolRow) {
      throw new Error(`School ${schoolId} not found`);
    }

    const studentCount = await db.$count(student);
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
        implementerId: auth.session.user.activeMembership?.implementerId,
        fellowId: group.leader.id,
        supervisorId: group.leader.supervisor?.id,
      })
      .returning();
    if (!created) {
      throw new Error("Could not create the student");
    }

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
    const auth = await checkAuth();
    const userId = auth.session.user.id;
    if (!userId) {
      throw new Error("The session has not been authenticated");
    }

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
    const studentRow = await db.query.student.findFirst({
      where: (s, { eq }) => eq(s.id, id),
      with: { assignedGroup: true },
    });
    if (!studentRow) {
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
    return {
      success: true,
      message: `Successfully marked attendance for ${studentRow.studentName}`,
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
    const auth = await checkAuth();
    const userId = auth.session.user.id;
    if (!userId) {
      throw new Error("The session has not been authenticated");
    }

    const { sessionId, absenceReason, attended, comments } = MarkAttendanceSchema.parse(data);

    const session = await requireSession(sessionId);

    if (!session.occurred) {
      return {
        success: false,
        message: "This session has not occurred yet.",
      };
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
    return {
      success: true,
      message: `Successfully marked attendance for ${ids.length} students`,
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
    await checkAuth();

    const { studentId, mode, dropoutReason } = DropoutStudentSchema.parse(data);
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
    await checkAuth();

    const { studentId } = ArchiveStudentSchema.parse(data);
    const [result] = await db
      .update(student)
      .set({ archivedAt: new Date() })
      .where(eq(student.id, studentId))
      .returning({ studentName: student.studentName });
    if (!result) {
      throw new Error(`Student ${studentId} not found`);
    }

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
    const auth = await checkAuth();
    const userId = auth.session.user.id;
    if (!userId) {
      throw new Error("The session has not been authenticated");
    }

    const { studentId, notes } = StudentReportingNotesSchema.parse(data);

    await db.insert(studentReportingNotes).values({ studentId, notes, addedBy: userId });
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
  await checkAuth();
  return await db.query.student.findMany({
    where: (s, { and, eq, isNull }) =>
      and(isNull(s.archivedAt), eq(s.admissionNumber, admissionNumber), eq(s.schoolId, schoolId)),
    with: { assignedGroup: { with: { leader: true } } },
  });
}

export async function transferStudentToGroup(id: string, groupId: string) {
  try {
    await checkAuth();
    const [updated] = await db
      .update(student)
      .set({ assignedGroupId: groupId })
      .where(eq(student.id, id))
      .returning({ studentName: student.studentName });
    if (!updated) {
      throw new Error(`Student ${id} not found`);
    }
    const group = await db.query.interventionGroup.findFirst({
      where: (g, { eq }) => eq(g.id, groupId),
      columns: { groupName: true },
    });

    return {
      success: true,
      message: `Successfully transferred ${updated.studentName} to group ${group?.groupName}`,
    };
  } catch {
    return { error: "Something went wrong while adding student to the group." };
  }
}

export async function getHubSchoolsForStudentTransfer() {
  const hubCoordinator = await currentHubCoordinator();
  const hubId = hubCoordinator?.profile?.assignedHubId;
  if (!hubId) {
    return [];
  }

  return await db.query.school.findMany({
    where: (s, { and, eq, isNull }) => and(eq(s.hubId, hubId), isNull(s.archivedAt)),
    columns: { id: true, schoolName: true, visibleId: true },
    orderBy: (s, { asc }) => asc(s.schoolName),
  });
}

export async function getSchoolGroupsForStudentTransfer(schoolId: string) {
  const hubCoordinator = await currentHubCoordinator();
  const hubId = hubCoordinator?.profile?.assignedHubId;
  if (!hubId) {
    return [];
  }

  return await db.query.interventionGroup.findMany({
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
    });
    if (!studentRow) {
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
