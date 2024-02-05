import {
  addDays,
  isSameDay,
  setHours,
  setMinutes,
  startOfWeek,
  subDays,
} from "date-fns";

import { processAttendances } from "#/app/api/payouts/generate/payout-utils";
import type { PayoutDay, PayoutReport } from "#/app/api/payouts/generate/types";
import { db } from "#/lib/db";

const PAY_PERIOD_CUTOFF_HOUR = 6; // 6am UTC / 9am EAT
const PAY_PERIOD_CUTOFF_MINUTE = 0;

export async function calculatePayouts({
  day,
  effectiveDate,
  supervisorId,
}: {
  day: PayoutDay;
  effectiveDate: Date;
  supervisorId?: string;
}): Promise<PayoutReport> {
  const payoutPeriodStart = getPayoutPeriodStartDate(day, effectiveDate);
  const payoutPeriodEnd = getPayoutPeriodEndDate(day, effectiveDate);

  const fulfilledDelayedPaymentRequests: { id: string }[] = [];

  const mainAttendances = await db.fellowAttendance.findMany({
    where: {
      session: {
        sessionDate: {
          gte: payoutPeriodStart,
          lt: payoutPeriodEnd,
        },
        occurred: true,
      },
      attended: true,
      ...(supervisorId && {
        supervisorId,
      }),
      delayedPaymentRequests: {
        none: {},
      },
    },
    include: {
      delayedPaymentRequests: true,
      fellow: {
        include: {
          supervisor: true,
        },
      },
      session: {
        include: {
          school: true,
        },
      },
    },
  });

  const delayedPaymentRequests = await db.delayedPaymentRequest.findMany({
    include: {
      fellowAttendance: {
        include: {
          delayedPaymentRequests: true,
          fellow: {
            include: {
              supervisor: true,
            },
          },
          session: {
            include: {
              school: true,
            },
          },
        },
      },
    },
  });

  const delayedAttendances: (typeof delayedPaymentRequests)[number]["fellowAttendance"][] =
    Object.values(
      delayedPaymentRequests
        .map((dpr) => dpr.fellowAttendance)
        .reduce(
          (acc, attendance) => {
            acc[attendance.id] = attendance;
            return acc;
          },
          {} as { [key: number]: (typeof delayedAttendances)[number] },
        ),
    );

  const delayedPaymentsFulfilled = delayedPaymentRequests.map((dpr) => ({
    id: dpr.id,
  }));

  for (let delayedAttendance of delayedAttendances) {
    if (
      delayedPaymentRequests.some((dpr) => dpr.fulfilledAt) &&
      delayedPaymentRequests.some((dpr) => !dpr.fulfilledAt)
    ) {
      console.warn(
        `Attendance ${delayedAttendance.id} has both fulfilled and unfulfilled delayed payment requests`,
      );
    }
    fulfilledDelayedPaymentRequests.push(...delayedPaymentRequests);
  }

  const eligibleAttendances = [...mainAttendances, ...delayedAttendances];

  const { payouts } = processAttendances(eligibleAttendances);

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
    attendancesFulfilled,
    delayedPaymentsFulfilled,
    totalPayoutAmount,
    totalPayoutAmountWithMpesaInfo,
  };
}

function setCutoffTime(date: Date): Date {
  return setMinutes(
    setHours(date, PAY_PERIOD_CUTOFF_HOUR),
    PAY_PERIOD_CUTOFF_MINUTE,
  );
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
      // For "M", start from last Thursday
      startDay = addDays(
        startOfWeek(subDays(effectiveDate, 7), { weekStartsOn: 1 }),
        3,
      );
      break;
    default:
      throw new Error("Invalid day");
  }

  // First pay period start date will cover previous week as well
  const specialDay = new Date(2024, 0, 29);
  if (isSameDay(startDay, specialDay)) {
    console.warn(`Accounting for special first payout period of 2024`);
    startDay = new Date(2024, 0, 23);
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
