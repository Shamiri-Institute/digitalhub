"use server";

import { getCurrentUser } from "#/app/auth";
import { WeeklyEvaluationFormValues } from "#/components/common/fellow-reports/weekly-fellow-evaluation/view-edit-weekly-fellow-evaluation";
import { WeeklyFellowEvaluationSchema } from "#/components/common/fellow/schema";
import { db } from "#/lib/db";

export const updateWeeklyEvaluation = async (
  userId: string,
  evaluationId: string,
  data: WeeklyEvaluationFormValues,
) => {
  try {
    const user = await getCurrentUser();
    if (user?.user.id !== userId && user?.personnelRole !== "hc") {
      return {
        success: false,
        message: "You are not authorized to perform this action",
      };
    }

    const {
      behaviourRating,
      behaviourNotes,
      programDeliveryRating,
      programDeliveryNotes,
      dressingAndGroomingRating,
      dressingAndGroomingNotes,
      punctualityRating,
      punctualityNotes,
    } = WeeklyFellowEvaluationSchema.parse(data);

    await db.weeklyFellowRatings.update({
      where: { id: evaluationId },
      data: {
        behaviourRating,
        behaviourNotes,
        programDeliveryRating,
        programDeliveryNotes,
        dressingAndGroomingRating,
        dressingAndGroomingNotes,
        punctualityRating,
        punctualityNotes,
      },
    });
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
