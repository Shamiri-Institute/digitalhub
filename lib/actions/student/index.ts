"use server";

import {
  MarkAttendanceSchema,
  StudentDetailsSchema,
} from "#/app/(platform)/hc/schemas";
import { currentHubCoordinator, currentSupervisor } from "#/app/auth";
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

    const { id, sessionId, absenceReason, attended, schoolId } =
      MarkAttendanceSchema.parse(data);
    const attendance = await db.studentAttendance.findFirst({
      where: {
        studentId: id,
        sessionId,
      },
    });

    if (attendance) {
      const result = await db.studentAttendance.update({
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
        include: {
          student: true,
        },
      });
      return {
        success: true,
        message: `Successfully marked attendance ${result.student.studentName}`,
      };
    } else {
      const result = await db.studentAttendance.create({
        data: {
          studentId: id,
          schoolId,
          absenceReason,
          groupId: null,
          attended:
            attended === "attended"
              ? true
              : attended === "missed"
                ? false
                : null,
        },
        include: {
          student: true,
        },
      });
      return {
        success: true,
        message: `Successfully updated details for ${result.student.studentName}`,
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
