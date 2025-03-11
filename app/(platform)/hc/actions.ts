"use server";

import { currentHubCoordinator } from "#/app/auth";
import { db } from "#/lib/db";
import { z } from "zod";
import { HubCoordinatorSchema } from "./schemas";

export async function updateHubCoordinatorProfile(
  formData: z.infer<typeof HubCoordinatorSchema>,
) {
  try {
    const user = await currentHubCoordinator();
    if (!user?.id) {
      return { success: false, message: "Unauthorized" };
    }

    const data = HubCoordinatorSchema.parse(formData);

    const dateValue = data.dateOfBirth ? new Date(data.dateOfBirth) : null;
    if (dateValue && isNaN(dateValue.getTime())) {
      return { success: false, message: "Invalid date format" };
    }

    const updated = await db.hubCoordinator.update({
      where: { id: user.id },
      data: {
        coordinatorEmail: data.coordinatorEmail,
        coordinatorName: data.coordinatorName,
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
    console.error("Error updating hub coordinator profile:", error);
    return { success: false, message: "Internal Server Error" };
  }
}
