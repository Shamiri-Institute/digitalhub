'use server'

import { db } from "#/lib/db";

export async function fetchFellowRatings(fellowId: string){

  const fellowAvgRatings = await db.weeklyFellowRatings.groupBy({
    by: ["fellowId"],
    _avg: {
      behaviourRating: true,
      programDeliveryRating: true,
      dressingAndGroomingRating: true,
      punctualityRating: true,
    },
    where: {
      fellowId: {
        in: [fellowId],
      },
    },
  });
  
    const ratings = fellowAvgRatings.find((i) => i.fellowId === fellowId);
    return {
      behaviourRating: ratings?._avg.behaviourRating,
      programDeliveryRating: ratings?._avg.programDeliveryRating,
      dressingAndGroomingRating: ratings?._avg.dressingAndGroomingRating,
      punctualityRating: ratings?._avg.punctualityRating,
    };
}