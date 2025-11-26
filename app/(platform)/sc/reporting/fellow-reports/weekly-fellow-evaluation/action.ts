"use server";

import { currentSupervisor } from "#/app/auth";
import type { WeeklyFellowEvaluation } from "#/components/common/fellow-reports/weekly-fellow-evaluation/types";
import { db } from "#/lib/db";

export async function loadWeeklyFellowEvaluation(): Promise<WeeklyFellowEvaluation[]> {
  try {
    const supervisor = await currentSupervisor();

    const userId = supervisor?.session.user.id;
    if (!supervisor || !userId) {
      throw new Error("Supervisor not found");
    }

    const fellows = await db.fellow.findMany({
      where: {
        supervisorId: supervisor.profile?.id,
      },
      include: {
        weeklyFellowRatings: true,
      },
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
          userId,
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
        })),
      };
    });

    return formattedData || [];
  } catch (error) {
    console.error(error);
    return [];
  }
}
