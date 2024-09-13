"use server";

import { StudentDetailsSchema } from "#/app/(platform)/hc/schemas";
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
    const { hubCoordinator, supervisor } = await checkAuth();

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
