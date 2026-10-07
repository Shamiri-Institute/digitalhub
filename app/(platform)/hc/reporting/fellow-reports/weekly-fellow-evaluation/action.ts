"use server";

import type { WeeklyFellowEvaluation } from "#/components/common/fellow-reports/weekly-fellow-evaluation/types";
import { db } from "#/db/client";
import { ImplementerRole } from "#/db/enums";
import { fellowsInCallerScope, requireHubRole } from "#/lib/auth/require-hub-role";

export async function loadHubWeeklyFellowEvaluation(): Promise<WeeklyFellowEvaluation[]> {
  const coordinator = await requireHubRole(ImplementerRole.HUB_COORDINATOR);
  // The same fellows as the other hub reports, borrowed fellows included.
  const fellows = await db.query.fellow.findMany({
    where: (f, { inArray }) => inArray(f.id, fellowsInCallerScope(coordinator)),
    with: { weeklyFellowRatings: { orderBy: (r, { asc }) => [asc(r.createdAt), asc(r.id)] } },
    orderBy: (f, { asc }) => [asc(f.createdAt), asc(f.id)],
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
      })),
    };
  });

  return formattedData || [];
}
