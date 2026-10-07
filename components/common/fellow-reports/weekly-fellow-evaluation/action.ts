"use server";

import { and, eq, inArray } from "drizzle-orm";
import { refresh } from "next/cache";

import type { WeeklyEvaluationFormValues } from "#/components/common/fellow-reports/weekly-fellow-evaluation/view-edit-weekly-fellow-evaluation";
import { db } from "#/db/client";
import { ImplementerRole } from "#/db/enums";
import { weeklyFellowRatings } from "#/db/schema";
import { fellowsInCallerScope, requireHubRole } from "#/lib/auth/require-hub-role";

/**
 * Updates a weekly fellow evaluation. A supervisor may edit the evaluations of the fellows they
 * supervise, and a hub coordinator those of their hub's fellows: the same rows each one's report
 * page lists. An evaluation outside that scope reads as missing.
 */
export const updateWeeklyEvaluation = async (
  evaluationId: string,
  data: WeeklyEvaluationFormValues,
) => {
  try {
    const caller = await requireHubRole(
      ImplementerRole.SUPERVISOR,
      ImplementerRole.HUB_COORDINATOR,
    );

    const updated = await db
      .update(weeklyFellowRatings)
      // Only the ratings and notes are editable; the fellow, supervisor and week stay as recorded.
      .set({
        behaviourRating: data.behaviourRating,
        behaviourNotes: data.behaviourNotes,
        programDeliveryRating: data.programDeliveryRating,
        programDeliveryNotes: data.programDeliveryNotes,
        dressingAndGroomingRating: data.dressingAndGroomingRating,
        dressingAndGroomingNotes: data.dressingAndGroomingNotes,
        punctualityRating: data.punctualityRating,
        punctualityNotes: data.punctualityNotes,
      })
      .where(
        and(
          eq(weeklyFellowRatings.id, evaluationId),
          inArray(weeklyFellowRatings.fellowId, fellowsInCallerScope(caller)),
        ),
      )
      .returning({ id: weeklyFellowRatings.id });
    if (updated.length === 0) {
      throw new Error(`Weekly evaluation ${evaluationId} not found`);
    }

    refresh();
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
