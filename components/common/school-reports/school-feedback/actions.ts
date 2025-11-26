"use server";

import { getCurrentPersonnel } from "#/app/auth";
import type { SchoolFeedbackFormValues } from "#/components/common/school-reports/school-feedback/view-edit-school-feedback";
import { db } from "#/lib/db";
import { ImplementerRole } from "@prisma/client";

export async function editSchoolFeedback(
  userId: string,
  feedbackId: string,
  data: SchoolFeedbackFormValues,
) {
  try {
    const user = await getCurrentPersonnel();
    if (user?.session?.user.id !== userId && user?.session?.user.activeMembership?.role !== ImplementerRole.HUB_COORDINATOR) {
      return {
        message: "You are not authorized to edit this feedback",
        success: false,
      };
    }

    await db.schoolFeedback.update({
      where: {
        id: feedbackId,
      },
      data: {
        ...data,
      },
    });

    return {
      success: true,
      message: "School feedback updated successfully",
    };
  } catch (error) {
    console.error(error);
    return {
      message: "Something went wrong",
      success: false,
    };
  }
}
