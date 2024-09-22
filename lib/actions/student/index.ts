"use server";

import {
  MarkAttendanceSchema,
  StudentDetailsSchema,
} from "#/app/(platform)/hc/schemas";
import { currentHubCoordinator, currentSupervisor } from "#/app/auth";
import { CURRENT_PROJECT_ID } from "#/lib/constants";
import { db } from "#/lib/db";
import { z } from "zod";

async function checkAuth() {
  const hubCoordinator = await currentHubCoordinator();
  const supervisor = await currentSupervisor();

  if (!hubCoordinator && !supervisor) {
    throw new Error("The session has not been authenticated");
  }

  return { hubCoordinator, supervisor };
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
    await checkAuth();

    const { id, sessionId, absenceReason, attended } =
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
            studentId: id,
            absenceReason,
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
              sessionId,
              groupId: student.assignedGroupId,
              fellowId: student.assignedGroup.leaderId,
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
