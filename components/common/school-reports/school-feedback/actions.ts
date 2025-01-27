"use server";

import { getCurrentUser } from "#/app/auth";
import { SchoolFeedbackFormValues } from "#/components/common/school-reports/school-feedback/view-edit-school-feedback";
import { db } from "#/lib/db";

export async function editSchoolFeedback(
  userId: string,
  feedbackId: string,
  data: SchoolFeedbackFormValues,
) {
  try {
    const user = await getCurrentUser();
    if (user?.user.id !== userId || user?.personnelRole !== "hc") {
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
