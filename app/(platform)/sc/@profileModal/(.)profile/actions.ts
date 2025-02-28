"use server";

import { currentSupervisor } from "#/app/auth";
import { db } from "#/lib/db";
import { z } from "zod";
import { SupervisorSchema } from "./schema";

export async function getSupervisorProfileData() {
  try {
    const user = await currentSupervisor();
    if (!user) throw new Error("Supervisor not found");

    const profile = await db.supervisor.findUnique({
      where: { id: user.id },
      select: {
        supervisorEmail: true,
        supervisorName: true,
        idNumber: true,
        cellNumber: true,
        mpesaNumber: true,
        dateOfBirth: true,
        gender: true,
        county: true,
        subCounty: true,
        bankName: true,
        bankBranch: true,
      },
    });

    return profile;
  } catch (error) {
    console.error("Error fetching supervisor profile:", error);
    throw new Error("Failed to fetch supervisor profile");
  }
}

export async function updateSupervisorProfile(
  formData: z.infer<typeof SupervisorSchema>,
) {
  try {
    const user = await currentSupervisor();
    if (!user?.id) {
      return { success: false, message: "Unauthorized" };
    }

    const data = SupervisorSchema.parse(formData);

    const dateValue = data.dateOfBirth ? new Date(data.dateOfBirth) : null;
    if (dateValue && isNaN(dateValue.getTime())) {
      return { success: false, message: "Invalid date format" };
    }

    const updated = await db.supervisor.update({
      where: { id: user.id },
      data: {
        supervisorEmail: data.supervisorEmail,
        supervisorName: data.supervisorName,
        idNumber: data.idNumber,
        cellNumber: data.cellNumber,
        mpesaNumber: data.mpesaNumber,
        dateOfBirth: dateValue,
        gender: data.gender,
        county: data.county,
        subCounty: data.subCounty,
        bankName: data.bankName,
        bankBranch: data.bankBranch,
      },
    });

    return { success: true, data: updated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        errors: error.errors,
        message: "Validation Error",
      };
    }
    console.error("Error updating supervisor profile:", error);
    return { success: false, message: "Internal Server Error" };
  }
}
