"use server";

import { eq } from "drizzle-orm";

import { getCurrentPersonnel } from "#/app/auth";
import type { SchoolFeedbackFormValues } from "#/components/common/school-reports/school-feedback/view-edit-school-feedback";
import { db } from "#/db/client";
import { ImplementerRole } from "#/db/enums";
import { schoolFeedback } from "#/db/schema";

export async function editSchoolFeedback(
  userId: string,
  feedbackId: string,
  data: SchoolFeedbackFormValues,
) {
  try {
    const user = await getCurrentPersonnel();
    if (
      user?.session?.user.id !== userId &&
      user?.session?.user.activeMembership?.role !== ImplementerRole.HUB_COORDINATOR
    ) {
      return {
        message: "You are not authorized to edit this feedback",
        success: false,
      };
    }

    const updated = await db
      .update(schoolFeedback)
      .set({ ...data })
      .where(eq(schoolFeedback.id, feedbackId))
      .returning({ id: schoolFeedback.id });
    if (updated.length === 0) {
      throw new Error(`School feedback ${feedbackId} not found`);
    }

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
