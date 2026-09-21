"use server";

import { eq } from "drizzle-orm";

import { revalidatePageAction } from "#/app/(platform)/hc/schools/actions";
import { getCurrentPersonnel } from "#/app/auth";
import type { WeeklyEvaluationFormValues } from "#/components/common/fellow-reports/weekly-fellow-evaluation/view-edit-weekly-fellow-evaluation";
import { db } from "#/db/client";
import { ImplementerRole } from "#/db/enums";
import { weeklyFellowRatings } from "#/db/schema";

export const updateWeeklyEvaluation = async (
  userId: string,
  evaluationId: string,
  data: WeeklyEvaluationFormValues,
) => {
  try {
    const user = await getCurrentPersonnel();
    if (
      user?.session?.user.id !== userId &&
      user?.session?.user.activeMembership?.role !== ImplementerRole.HUB_COORDINATOR
    ) {
      return {
        success: false,
        message: "You are not authorized to perform this action",
      };
    }

    const updated = await db
      .update(weeklyFellowRatings)
      .set({ ...data })
      .where(eq(weeklyFellowRatings.id, evaluationId))
      .returning({ id: weeklyFellowRatings.id });
    if (updated.length === 0) {
      throw new Error(`Weekly evaluation ${evaluationId} not found`);
    }

    await revalidatePageAction("sc/reporting/fellow-reports/weekly-fellow-evaluation");
    return {
      success: true,
      message: "Weekly evaluation updated successfully",
    };
  } catch (error) {
    console.error(error);
    return {
      success: false,
      message: "Something went wrong",
    };
  }
};
