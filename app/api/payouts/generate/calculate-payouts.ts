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
  effectiveDate,
}: {
  day: PayoutDay;
  effectiveDate: Date;
}): Promise<PayoutReport> {
  const payoutPeriodStart = getPayoutPeriodStartDate(day, effectiveDate);
  const payoutPeriodEnd = getPayoutPeriodEndDate(day, effectiveDate);

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
    const { fellow, session } = attendance;
    if (!payouts[fellow.visibleId]) {
      payouts[fellow.visibleId] = {
        supervisorVisibleId: fellow.supervisor?.visibleId ?? "N/A",
        supervisorName: fellow.supervisor?.supervisorName ?? "N/A",
        fellowVisibleId: fellow.visibleId,
        fellowName: fellow.fellowName ?? "N/A",
        mpesaName: fellow.mpesaName ?? "N/A",
        mpesaNumber: fellow.mpesaNumber ?? "N/A",
        kesPayoutAmount: 0,
        presessionCount: 0,
        sessionCount: 0,
      };
    }
    const sessionType = session?.sessionType;
    const payout = payouts[fellow.visibleId];

    const cacheKey = `${fellow.visibleId}-${attendance.schoolId}-${session?.sessionType}`;

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

const cutoffHour = 0; // 6am UTC / 9am EAT
const cutoffMinute = 0;

function setCutoffTime(date: Date): Date {
  return setMinutes(setHours(date, cutoffHour), cutoffMinute);
}

export function getPayoutPeriodStartDate(
  day: PayoutDay,
  effectiveDate: Date,
): Date {
  let startDay: Date;

  switch (day) {
    case "R":
      // For "R", start from this Monday
      startDay = startOfWeek(effectiveDate, { weekStartsOn: 1 });
      break;
    case "M":
      // For "M", start from last Monday then move to Thursday
      startDay = addDays(
        startOfWeek(subDays(effectiveDate, 7), { weekStartsOn: 1 }),
        3,
      );
      break;
    default:
      throw new Error("Invalid day");
  }

  return setCutoffTime(startDay);
}

export function getPayoutPeriodEndDate(
  day: PayoutDay,
  effectiveDate: Date,
): Date {
  let endDay: Date;

  switch (day) {
    case "R":
      // For "R", end on this Thursday
      endDay = addDays(startOfWeek(effectiveDate, { weekStartsOn: 1 }), 3);
      break;
    case "M":
      // For "M", end on this Monday
      endDay = startOfWeek(effectiveDate, { weekStartsOn: 1 });
      break;
    default:
      throw new Error("Invalid day");
  }

  return setCutoffTime(endDay);
}
