import { processAttendances } from "#/app/api/payouts/generate/payout-utils";
import type { RepaymentReport } from "#/app/api/payouts/generate/types";
import { db } from "#/lib/db";

export async function calculateRepayments(): Promise<RepaymentReport> {
  const repaymentRequests = await db.repaymentRequest.findMany({
    where: {
      fulfilledAt: null,
      rejectedAt: null,
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

  const { payouts } = processAttendances(
    repaymentRequests.map((rr) => rr.fellowAttendance),
  );

  const payoutRows = Object.values(payouts);
  const totalPayoutAmount = payoutRows.reduce(
    (acc, row) => acc + row.kesPayoutAmount,
    0,
  );

  return {
    payoutDetails: payoutRows,
    incompleteRecords: {
      countMissingMpesaName: payoutsWithoutMpesaName,
      countMissingMpesaNumber: payoutsWithoutMpesaNumber,
    },
    totalRepaymentAmount: totalPayoutAmount,
    repaymentRequestsFulfilled: repaymentRequests.map((rr) => ({ id: rr.id })),
  };
}
