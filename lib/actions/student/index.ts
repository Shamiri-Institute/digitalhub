"use server";

import {
  DropoutStudentSchema,
  MarkAttendanceSchema,
  StudentReportingNotesSchema,
} from "#/app/(platform)/hc/schemas";
import {
  currentHubCoordinator,
  currentSupervisor,
  getCurrentUser,
} from "#/app/auth";
import { StudentDetailsSchema } from "#/components/common/student/schemas";
import { CURRENT_PROJECT_ID } from "#/lib/constants";
import { objectId } from "#/lib/crypto";
import { db } from "#/lib/db";
import { generateStudentVisibleID } from "#/lib/utils";
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

export async function submitStudentDetails(
  data: z.infer<typeof StudentDetailsSchema>,
) {
  try {
    await checkAuth();

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
      schoolVisibleId,
    } = StudentDetailsSchema.parse(data);

    if (mode === "edit") {
      await db.student.update({
        where: {
          id,
        },
        data: {
          studentName,
          gender,
          yearOfBirth,
          form,
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
      });
      const school = await db.school.findFirstOrThrow({
        where: {
          visibleId: schoolVisibleId,
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
          yearOfBirth,
          gender,
          form,
          stream,
          assignedGroupId,
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
      const attendance = await db.studentAttendance.findFirst({
        where: {
          studentId: id,
          sessionId,
        },
      });

      if (attendance) {
        await db.studentAttendance.update({
          where: {
            id: attendance.id,
          },
          data: {
            markedBy: auth.user!.user.id,
            studentId: id,
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
          message: `Successfully updated attendance for ${student.studentName}`,
        };
      } else {
        if (student.assignedGroup) {
          await db.studentAttendance.create({
            data: {
              studentId: id,
              schoolId: student.schoolId,
              projectId: CURRENT_PROJECT_ID,
              absenceReason,
              comments,
              sessionId,
              groupId: student.assignedGroupId,
              fellowId: student.assignedGroup.leaderId,
              markedBy: auth.user!.user.id,
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
            message: `${student.studentName} has not been assigned to a group.`,
          };
        }
      }
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
        (err as Error)?.message ?? "Sorry, could not mark student attendance.",
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
  schoolVisibleId: string,
) {
  await checkAuth();
  return await db.student.findMany({
    where: {
      admissionNumber: admissionNumber,
      school: {
        visibleId: schoolVisibleId,
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
