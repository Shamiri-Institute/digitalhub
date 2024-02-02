import { addDays, setHours, setMinutes, startOfWeek, subDays } from "date-fns";

import type { PayoutDay } from "#/app/api/payouts/generate/types";
import { db } from "#/lib/db";

type PayoutDetail = {
  supervisorVisibleId: string;
  supervisorName: string;
  fellowVisibleId: string;
  fellowName: string;
  mpesaName: string;
  mpesaNumber: string;
  kesPayoutAmount: number;
  presessionCount: number;
  sessionCount: number;
};

type PayoutReport = {
  payoutDetails: PayoutDetail[];
  payoutPeriod: {
    startDate: Date;
    endDate: Date;
  };
  incompleteRecords: {
    countMissingMpesaName: number;
    countMissingMpesaNumber: number;
  };
  totalPayoutAmount: number;
  totalPayoutAmountWithMpesaInfo: number;
};

export async function calculatePayouts({
  day,
  currentDate,
}: {
  day: PayoutDay;
  currentDate: Date;
}): Promise<PayoutReport> {
  const payoutPeriodStart = getStartCuttoffRange(day);
  const payoutPeriodEnd = getEndCuttoffRange(day);

  const attendances = await db.fellowAttendance.findMany({
    where: {
      session: {
        sessionDate: {
          gte: payoutPeriodStart,
          lt: payoutPeriodEnd,
        },
        occurred: true,
      },
      attended: true,
    },
    include: {
      fellow: {
        include: {
          supervisor: true,
        },
      },
      session: true,
    },
  });

  const payouts: {
    [fellowVisibleId: string]: PayoutDetail;
  } = {};

  const payoutCache = new Set<string>();

  for (const attendance of attendances) {
    if (!payouts[attendance.fellow.visibleId]) {
      payouts[attendance.fellow.visibleId] = {
        supervisorVisibleId: attendance.fellow.supervisor?.visibleId ?? "N/A",
        supervisorName: attendance.fellow.supervisor?.supervisorName ?? "N/A",
        fellowVisibleId: attendance.fellow.visibleId,
        fellowName: attendance.fellow.fellowName ?? "N/A",
        mpesaName: attendance.fellow.mpesaName ?? "N/A",
        mpesaNumber: attendance.fellow.mpesaNumber ?? "N/A",
        kesPayoutAmount: 0,
        presessionCount: 0,
        sessionCount: 0,
      };
    }
    const sessionType = attendance.session?.sessionType;
    const payout = payouts[attendance.fellow.visibleId];

    const cacheKey = `${attendance.fellow.visibleId}-${attendance.schoolId}-${attendance.session?.sessionType}`;

    if (sessionType && payout) {
      if (sessionType === "s0") {
        if (!payoutCache.has(cacheKey)) {
          payout.kesPayoutAmount += 500;
          payout.presessionCount += 1;
          payoutCache.add(cacheKey);
        }
      } else if (["s1", "s2", "s3", "s4"].includes(sessionType)) {
        if (!payoutCache.has(cacheKey)) {
          payout.kesPayoutAmount += 1500;
          payout.sessionCount += 1;
          payoutCache.add(cacheKey);
        }
      } else {
        throw new Error("Invalid session type");
      }
    }
  }
  const payoutRows = Object.values(payouts);

  const payoutsWithoutMpesaNumber = payoutRows.filter(
    (payout) => !payout.mpesaNumber,
  ).length;
  const payoutsWithoutMpesaName = payoutRows.filter(
    (payout) => !payout.mpesaName,
  ).length;
  const totalPayoutAmount = payoutRows.reduce(
    (acc, payout) => acc + payout.kesPayoutAmount,
    0,
  );
  const totalPayoutAmountWithMpesaInfo = payoutRows
    .filter((payout) => payout.mpesaNumber && payout.mpesaName)
    .reduce((acc, payout) => acc + payout.kesPayoutAmount, 0);

  return {
    payoutDetails: payoutRows,
    payoutPeriod: {
      startDate: payoutPeriodStart,
      endDate: payoutPeriodEnd,
    },
    incompleteRecords: {
      countMissingMpesaName: payoutsWithoutMpesaName,
      countMissingMpesaNumber: payoutsWithoutMpesaNumber,
    },
    totalPayoutAmount,
    totalPayoutAmountWithMpesaInfo,
  };
}

const cutoffHour = 6; // 6am UTC / 9am EAT
const cutoffMinute = 0;

export function getStartCuttoffRange(day: PayoutDay): Date {
  switch (day) {
    case "R":
      let thisMonday = startOfWeek(new Date(), { weekStartsOn: 1 });

      thisMonday = setHours(thisMonday, cutoffHour);
      thisMonday = setMinutes(thisMonday, cutoffMinute);
      return thisMonday;
    case "M":
      let lastMonday = startOfWeek(subDays(new Date(), 7), {
        weekStartsOn: 1,
      });

      let lastThursday = setHours(lastMonday, cutoffHour);
      lastThursday = setMinutes(lastThursday, cutoffMinute);
      lastThursday = addDays(lastThursday, 3); // Move to Thursday
      return lastThursday;
    default:
      throw new Error("Invalid day");
  }
}

export function getEndCuttoffRange(day: PayoutDay): Date {
  switch (day) {
    case "R":
      let thisThursday = startOfWeek(new Date(), { weekStartsOn: 1 });
      thisThursday = setHours(thisThursday, cutoffHour);
      thisThursday = setMinutes(thisThursday, cutoffMinute);
      thisThursday = addDays(thisThursday, 3); // Move to Thursday

      return thisThursday;
    case "M":
      let thisMonday = startOfWeek(new Date(), { weekStartsOn: 1 });
      thisMonday = setHours(thisMonday, cutoffHour);
      thisMonday = setMinutes(thisMonday, cutoffMinute);
      return thisMonday;
    default:
      throw new Error("Invalid day");
  }
}
