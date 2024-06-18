import * as Sentry from "@sentry/nextjs";
import {
  addDays,
  format,
  isSameDay,
  setHours,
  setMinutes,
  startOfWeek,
  subDays,
} from "date-fns";

import { processAttendances } from "#/app/api/payouts/generate/payout-utils";
import type {
  PayoutDay,
  PayoutDetail,
  PayoutReport,
} from "#/app/api/payouts/generate/types";
import { db } from "#/lib/db";

const PAY_PERIOD_CUTOFF_HOUR = 6; // 6am UTC / 9am EAT
const PAY_PERIOD_CUTOFF_MINUTE = 0;

export async function calculatePayouts({
  day,
  effectiveDate,
  supervisorId,
  implementerId,
}: {
  day: PayoutDay;
  effectiveDate: Date;
  supervisorId?: string;
  implementerId: string;
}): Promise<PayoutReport> {
  const payoutPeriodStart = getPayoutPeriodStartDate(day, effectiveDate);
  const payoutPeriodEnd = getPayoutPeriodEndDate(day, effectiveDate);

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
      fellow: {
        OR: [{ droppedOut: false }, { droppedOut: null }],
        implementerId,
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
    where: {
      AND: {
        fulfilledAt: null,
        rejectedAt: null,
      },
      fellow: {
        OR: [{ droppedOut: false }, { droppedOut: null }],
        implementerId,
      },
      ...(supervisorId && {
        supervisorId,
      }),
    },
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

  const eligibleAttendances = [...mainAttendances, ...delayedAttendances];

  const { payouts } = processAttendances(eligibleAttendances);

  const reconciliations = await db.payoutReconciliation.findMany({
    where: {
      fellowId: {
        in: eligibleAttendances.map((attendance) => attendance.fellowId),
      },
      fellow: {
        OR: [{ droppedOut: false }, { droppedOut: null }],
        implementerId,
      },
      executedAt: null,
    },
    orderBy: {
      fellowId: "asc",
    },
    include: {
      fellow: true,
    },
  });

  const reconciliationsFulfilled: { id: string; newPayout?: PayoutDetail }[] =
    [];
  for (const reconciliation of reconciliations) {
    const payout = payouts[reconciliation.fellow.visibleId];
    if (payout) {
      let newPayout: PayoutDetail | undefined = undefined;
      if (
        reconciliation.amount < 0 &&
        payout.kesPayoutAmount < Math.abs(reconciliation.amount)
      ) {
        const balance =
          Math.abs(reconciliation.amount) - payout.kesPayoutAmount;
        const oldPayoutAmount = payout.kesPayoutAmount;
        payout.kesPayoutAmount = 0;
        payout.notes += `/${oldPayoutAmount} ${reconciliation.currency} not paid. Negative balance of ${balance} ${reconciliation.currency} carried forward.`;

        newPayout = {
          ...payout,
          kesPayoutAmount: balance,
          notes: `${payout.notes}. Balance carried forward from ${format(effectiveDate, "yyyy/mm/dd")}, ${balance} remaining.`,
        };
      } else {
        payout.kesPayoutAmount += reconciliation.amount;
        if (payout.notes.length !== 0) {
          payout.notes += "/";
        }
        payout.notes +=
          reconciliation.description ??
          `Adjustment of ${reconciliation.amount} ${reconciliation.currency} made.`;
      }

      reconciliationsFulfilled.push({
        id: reconciliation.id.toString(),
        newPayout,
      });
    } else {
      Sentry.captureException(
        new Error(
          `Reconciliation for fellow ${reconciliation.fellow.visibleId} not found in payouts`,
        ),
      );
      console.warn(
        `Reconciliation for fellow ${reconciliation.fellow.visibleId} not found in payouts`,
      );
    }
  }

  const payoutRows = Object.values(payouts);

  const payoutsWithoutMpesaNumber = payoutRows.filter(
    (payout) => payout.mpesaNumber?.length === 0,
  ).length;
  const payoutsWithoutMpesaName = payoutRows.filter(
    (payout) => payout.mpesaName?.length === 0,
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
    attendancesProcessed: eligibleAttendances.map((attendance) => ({
      id: attendance.id.toString(),
    })),
    delayedPaymentsFulfilled,
    reconciliationsFulfilled,
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
