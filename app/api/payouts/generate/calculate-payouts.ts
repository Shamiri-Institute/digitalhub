import {
  addDays,
  isBefore,
  isSameDay,
  setHours,
  setMinutes,
  startOfWeek,
  subDays,
} from "date-fns";

import type {
  PayoutDay,
  PayoutDetail,
  PayoutReport,
} from "#/app/api/payouts/generate/types";
import { db } from "#/lib/db";

const PRE_SESSION_COMPENSATION = 500;
const MAIN_SESSION_COMPENSATION = 1500;

const PAY_PERIOD_CUTOFF_HOUR = 6; // 6am UTC / 9am EAT
const PAY_PERIOD_CUTOFF_MINUTE = 0;

const ATTENDANCE_MARKING_CUTOFF_HOUR = 11; // 8am UTC / 11am EAT
const ATTENDANCE_MARKING_CUTOFF_MINUTE = 0;

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
      ...(supervisorId && {
        supervisorId,
      }),
    },
    include: {
      delayedPaymentRequests: true,
      fellow: {
        include: {
          supervisor: true,
        },
      },
      session: true,
    },
  });

  const attendancesWithDelayedPaymentRequests = attendances.filter(
    (attendance) => attendance.delayedPaymentRequests.length > 0,
  ).length;

  const payouts: {
    [fellowVisibleId: string]: PayoutDetail;
  } = {};

  const payoutCache = new Set<string>();

  let eligibleAttendances = attendances.filter(
    (attendance) => attendance.delayedPaymentRequests.length === 0,
  );
  if (isSameDay(payoutPeriodStart, new Date(2024, 0, 23))) {
    console.warn(
      "Accounting for delayed payment repayment requests that we fufilled early",
    );
    const attendanceMarkingCutoff = new Date(
      2024,
      1,
      1,
      ATTENDANCE_MARKING_CUTOFF_HOUR,
      ATTENDANCE_MARKING_CUTOFF_MINUTE,
    );
    eligibleAttendances = attendances.filter((attendance) => {
      const markedBeforeFeb2MarkingCutoff =
        attendance.delayedPaymentRequests.some((dpr) => {
          return isBefore(dpr.createdAt, attendanceMarkingCutoff);
        });
      if (
        !isBefore(attendance.createdAt, attendanceMarkingCutoff) &&
        attendance.delayedPaymentRequests.length === 0
      ) {
        return false;
      }
      return (
        attendance.delayedPaymentRequests.length === 0 ||
        markedBeforeFeb2MarkingCutoff
      );
    });
  }
  for (const attendance of eligibleAttendances) {
    const { fellow, session } = attendance;
    if (!payouts[fellow.visibleId]) {
      payouts[fellow.visibleId] = {
        fellowVisibleId: fellow.visibleId,
        fellowName: fellow.fellowName ?? "N/A",
        mpesaName: fellow.mpesaName ?? "N/A",
        mpesaNumber: fellow.mpesaNumber ?? "N/A",
        kesPayoutAmount: 0,
        supervisorVisibleId: fellow.supervisor?.visibleId ?? "N/A",
        supervisorName: fellow.supervisor?.supervisorName ?? "N/A",
        preSessionCount: 0,
        mainSessionCount: 0,
      };
    }
    const sessionType = session?.sessionType;
    const payout = payouts[fellow.visibleId];

    const cacheKey = `${fellow.visibleId}-${attendance.schoolId}-${session?.sessionType}`;

    if (sessionType && payout) {
      if (sessionType === "s0") {
        if (!payoutCache.has(cacheKey)) {
          payout.kesPayoutAmount += PRE_SESSION_COMPENSATION;
          payout.preSessionCount += 1;
          payoutCache.add(cacheKey);
        }
      } else if (["s1", "s2", "s3", "s4"].includes(sessionType)) {
        if (!payoutCache.has(cacheKey)) {
          payout.kesPayoutAmount += MAIN_SESSION_COMPENSATION;
          payout.mainSessionCount += 1;
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
    attendancesWithDelayedPaymentRequests,
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
