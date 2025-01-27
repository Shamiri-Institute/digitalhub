"use server";

import { currentSupervisor } from "#/app/auth";
import { db } from "#/lib/db";

export type WeeklyFellowEvaluationType = Awaited<
  ReturnType<typeof loadWeeklyFellowEvaluation>
>[number];

export async function loadWeeklyFellowEvaluation() {
  try {
    const supervisor = await currentSupervisor();
    if (!supervisor) {
      throw new Error("Supervisor not found");
    }

    const fellows = await db.fellow.findMany({
      where: {
        supervisorId: supervisor?.id,
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
          fellow.weeklyFellowRatings.reduce(
            (a, b) => a + (b?.behaviourRating ?? 0),
            0,
          ) / fellow.weeklyFellowRatings.length,
        avgProgramDelivery:
          fellow.weeklyFellowRatings.reduce(
            (a, b) => a + (b?.programDeliveryRating ?? 0),
            0,
          ) / fellow.weeklyFellowRatings.length,
        avgDressingGrooming:
          fellow.weeklyFellowRatings.reduce(
            (a, b) => a + (b?.dressingAndGroomingRating ?? 0),
            0,
          ) / fellow.weeklyFellowRatings.length,
        week: fellow.weeklyFellowRatings.map((rating) => ({
          evaluationId: rating.id,
          week: rating.week,
          behaviour: rating.behaviourRating,
          programDelivery: rating.programDeliveryRating,
          dressingGrooming: rating.dressingAndGroomingRating,
          // attendancePunctuality: rating.studentAttendanceRating ?? 0
          attendancePunctuality: 4,
        })),
      };
    });

    return formattedData || [];
  } catch (error) {
    console.error(error);
    return [];
  }
}
