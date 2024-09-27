"use server";

import {
  DropoutStudentSchema,
  MarkAttendanceSchema,
  StudentDetailsSchema,
} from "#/app/(platform)/hc/schemas";
import {
  currentHubCoordinator,
  currentSupervisor,
  getCurrentUser,
} from "#/app/auth";
import { CURRENT_PROJECT_ID } from "#/lib/constants";
import { db } from "#/lib/db";
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
    } = StudentDetailsSchema.parse(data);

    await db.student.update({
      where: {
        id,
      },
      data: {
        studentName,
        gender,
        yearOfBirth,
        admissionNumber,
        form,
        stream,
        phoneNumber,
      },
    });
    return {
      success: true,
      message: `Successfully updated details for ${studentName}`,
    };
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
