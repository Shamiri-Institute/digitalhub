"use server";

import { currentHubCoordinator } from "#/app/auth";
import type { WeeklyFellowEvaluation } from "#/components/common/fellow-reports/weekly-fellow-evaluation/types";
import { db } from "#/db/client";

export async function loadHubWeeklyFellowEvaluation(): Promise<WeeklyFellowEvaluation[]> {
  try {
    const hubCoordinator = await currentHubCoordinator();
    if (!hubCoordinator?.session?.user.id) {
      throw new Error("Hub Coordinator not found");
    }

    const userId = hubCoordinator.session.user.id;

    const hubId = hubCoordinator.profile?.assignedHubId;
    const fellows = await db.query.fellow.findMany({
      where: (f, { eq, isNull }) => (hubId === null ? isNull(f.hubId) : eq(f.hubId, hubId)),
      with: { weeklyFellowRatings: true },
    });

    const formattedData = fellows.map((fellow) => {
      return {
        id: fellow.id,
        fellowName: fellow.fellowName,
        avgBehaviour:
          fellow.weeklyFellowRatings.reduce((a, b) => a + (b?.behaviourRating ?? 0), 0) /
          fellow.weeklyFellowRatings.length,
        avgProgramDelivery:
          fellow.weeklyFellowRatings.reduce((a, b) => a + (b?.programDeliveryRating ?? 0), 0) /
          fellow.weeklyFellowRatings.length,
        avgDressingGrooming:
          fellow.weeklyFellowRatings.reduce((a, b) => a + (b?.dressingAndGroomingRating ?? 0), 0) /
          fellow.weeklyFellowRatings.length,
        week: fellow.weeklyFellowRatings.map((rating) => ({
          evaluationId: rating.id,
          week: rating.week,
          behaviour: rating.behaviourRating ?? 0,
          behaviourNotes: rating.behaviourNotes,
          programDelivery: rating.programDeliveryRating ?? 0,
          programDeliveryNotes: rating.programDeliveryNotes,
          dressingGrooming: rating.dressingAndGroomingRating ?? 0,
          dressingGroomingNotes: rating.dressingAndGroomingNotes,
          attendancePunctuality: rating.punctualityRating ?? 0,
          attendancePunctualityNotes: rating.punctualityNotes,
          userId,
        })),
      };
    });

    return formattedData || [];
  } catch (error) {
    console.error(error);
    return [];
  }
}
