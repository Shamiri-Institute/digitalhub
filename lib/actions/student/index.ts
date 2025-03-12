"use server";

import {
  DropoutStudentSchema,
  MarkAttendanceSchema,
  StudentReportingNotesSchema,
} from "#/app/(platform)/hc/schemas";
import { getCurrentPersonnel } from "#/app/auth";
import { StudentDetailsSchema } from "#/components/common/student/schemas";
import { objectId } from "#/lib/crypto";
import { db } from "#/lib/db";
import { generateStudentVisibleID } from "#/lib/utils";
import { Prisma } from "@prisma/client";
import { z } from "zod";

async function checkAuth() {
  const user = await getCurrentPersonnel();
  if (user === null) {
    throw new Error("The session has not been authenticated");
  }
  return user;
  // const hubCoordinator = await currentHubCoordinator();
  // const supervisor = await currentSupervisor();
  // const fellow = await currentFellow();
  //
  // if (!hubCoordinator && !supervisor && !fellow) {
  //   throw new Error("The session has not been authenticated");
  // }
  //
  // return { hubCoordinator, supervisor, fellow, user };
}

export async function submitStudentDetails(
  data: z.infer<typeof StudentDetailsSchema>,
) {
  // TODO: Add db transactions
  try {
    const user = await checkAuth();

    const {
      id,
      studentName,
      form,
      stream,
      gender,
      yearOfBirth,
      admissionNumber,
      phoneNumber,
      mode,
      assignedGroupId,
      schoolId,
    } = StudentDetailsSchema.parse(data);

    if (mode === "edit") {
      await db.student.update({
        where: {
          id,
        },
        data: {
          studentName,
          gender,
          yearOfBirth: Number(yearOfBirth),
          form: Number(form),
          stream,
          phoneNumber,
        },
      });
      return {
        success: true,
        message: `Successfully updated details for ${studentName}`,
      };
    } else {
      const group = await db.interventionGroup.findFirstOrThrow({
        where: {
          id: assignedGroupId,
        },
        include: {
          leader: {
            include: {
              supervisor: true,
            },
          },
        },
      });
      const school = await db.school.findFirstOrThrow({
        where: {
          id: schoolId,
        },
      });

      const studentCount = await db.student.count();
      const student = await db.student.create({
        data: {
          id: objectId("stu"),
          visibleId: generateStudentVisibleID(
            group?.groupName ?? "NA",
            studentCount,
          ),
          studentName,
          schoolId: school.id,
          admissionNumber,
          yearOfBirth: Number(yearOfBirth),
          gender,
          form: Number(form),
          stream,
          assignedGroupId,
          implementerId: user.implementerId,
          fellowId: group.leader.id,
          supervisorId: group.leader.supervisor?.id,
        },
      });

      return {
        success: true,
        message: `Successfully added ${student.studentName} to group ${group.groupName}`,
        data: student,
      };
    }
  } catch (err) {
    console.error(err);
    return {
      success: false,
      message:
        (err as Error)?.message ??
        "Sorry, could not update student information.",
    };
  }
}

export async function markStudentAttendance(
  data: z.infer<typeof MarkAttendanceSchema>,
) {
  try {
    const auth = await checkAuth();

    const { id, sessionId, absenceReason, attended, comments } =
      MarkAttendanceSchema.parse(data);
    const student = await db.student.findUniqueOrThrow({
      where: {
        id,
      },
      include: {
        assignedGroup: true,
      },
    });

    if (student) {
      if (!student.assignedGroup) {
        return {
          success: false,
          message: `${student.studentName} has not been assigned to a group.`,
        };
      }

      await db.studentAttendance.upsert({
        where: {
          studentId_sessionId: {
            studentId: student.id,
            sessionId,
          },
        },
        create: {
          studentId: student.id,
          schoolId: student.schoolId,
          projectId: student.assignedGroup.projectId,
          absenceReason,
          comments,
          sessionId,
          groupId: student.assignedGroup.id,
          fellowId: student.assignedGroup.leaderId,
          markedBy: auth.user.user.id,
          attended:
            attended === "attended"
              ? true
              : attended === "missed"
                ? false
                : null,
        },
        update: {
          markedBy: auth.user.user.id,
          studentId: student.id,
          absenceReason,
          comments,
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
        message: `Successfully marked attendance for ${student.studentName}`,
      };
    } else {
      return {
        success: false,
        message: `Student details not found.`,
      };
    }
  } catch (err) {
    console.error(err);
    return {
      success: false,
      message:
        (err as Error)?.message ??
        "Sorry, an error occurred while marking student attendance.",
    };
  }
}

export async function markManyStudentsAttendance(
  ids: string[],
  data: z.infer<typeof MarkAttendanceSchema>,
) {
  try {
    const auth = await checkAuth();
    const { sessionId, absenceReason, attended, comments } =
      MarkAttendanceSchema.parse(data);
    const status =
      attended === "attended" ? true : attended === "missed" ? false : null;

    await db.$transaction(async (tx) => {
      // Create new attendance records
      const attendances = await tx.studentAttendance.findMany({
        where: {
          studentId: {
            in: ids,
          },
          sessionId,
        },
        include: {
          student: true,
        },
      });

      const studentIds = ids.filter((id) => {
        return !attendances.map((x) => x.studentId).includes(id);
      });

      const students = await tx.student.findMany({
        where: {
          id: {
            in: studentIds,
          },
        },
        include: {
          assignedGroup: true,
        },
      });

      let createRecords: Prisma.StudentAttendanceCreateManyInput[] = [];

      students.forEach((student) => {
        if (!student.assignedGroup) {
          throw new Error(
            `${student.studentName} has not been assigned to a group.`,
          );
        }

        createRecords.push({
          studentId: student.id,
          schoolId: student.schoolId,
          projectId: student.assignedGroup.projectId,
          absenceReason,
          comments,
          sessionId,
          groupId: student.assignedGroup.id,
          fellowId: student.assignedGroup.leaderId,
          markedBy: auth.user.user.id,
          attended: status,
        });
      });

      await tx.studentAttendance.createMany({
        data: createRecords,
      });

      // Update existing attendances
      await tx.studentAttendance.updateMany({
        where: {
          studentId: {
            in: ids,
          },
          sessionId,
        },
        data: {
          markedBy: auth.user.user.id,
          absenceReason: status === null || status ? null : absenceReason,
          comments: status === null || status ? null : comments,
          attended: status,
        },
      });
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
        (err as Error)?.message ??
        "Sorry, an error occurred while marking student attendance.",
    };
  }
}

export async function dropoutStudent(
  data: z.infer<typeof DropoutStudentSchema>,
) {
  try {
    await checkAuth();

    const { studentId, mode, dropoutReason } = DropoutStudentSchema.parse(data);
    const result = await db.student.update({
      data: {
        droppedOut: mode === "dropout",
        dropOutReason: mode === "dropout" ? dropoutReason : null,
        droppedOutAt: mode === "dropout" ? new Date() : null,
      },
      where: {
        id: studentId,
      },
    });

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

export async function submitStudentReportingNotes(
  data: z.infer<typeof StudentReportingNotesSchema>,
) {
  try {
    const auth = await checkAuth();

    const { studentId, notes } = StudentReportingNotesSchema.parse(data);

    await db.studentReportingNotes.create({
      data: {
        studentId,
        notes,
        addedBy: auth.user!.user.id,
      },
    });
    return {
      success: true,
      message: `Successfully submitted reporting notes`,
    };
  } catch (err) {
    console.error(err);
    return {
      success: false,
      message:
        (err as Error)?.message ?? "Sorry, could not submit reporting notes.",
    };
  }
}

export async function checkExistingStudents(
  admissionNumber: string,
  schoolId: string,
) {
  await checkAuth();
  return await db.student.findMany({
    where: {
      admissionNumber: admissionNumber,
      school: {
        id: schoolId,
      },
    },
    include: {
      assignedGroup: {
        include: {
          leader: true,
        },
      },
    },
  });
}

export async function transferStudentToGroup(id: string, groupId: string) {
  try {
    await checkAuth();
    const student = await db.student.update({
      where: {
        id,
      },
      data: {
        assignedGroupId: groupId,
      },
      include: {
        assignedGroup: true,
      },
    });

    return {
      success: true,
      message: `Successfully transferred ${student.studentName} to group ${student.assignedGroup?.groupName}`,
    };
  } catch (error: unknown) {
    return { error: "Something went wrong while adding student to the group." };
  }
}
