import { Prisma } from "@prisma/client";

import type { PayoutDetail } from "#/app/api/payouts/generate/types";
import { sessionDisplayName } from "#/lib/utils";

export const PRE_SESSION_COMPENSATION = 500;
export const MAIN_SESSION_COMPENSATION = 1500;

export const processAttendances = (
  attendances: Prisma.FellowAttendanceGetPayload<{
    include: {
      delayedPaymentRequests: true;
      fellow: {
        include: {
          supervisor: true;
        };
      };
      session: {
        include: {
          school: true;
        };
      };
    };
  }>[],
): {
  payouts: { [fellowVisibleId: string]: PayoutDetail };
} => {
  const payouts: { [fellowVisibleId: string]: PayoutDetail } = {};

  const payoutCache = new Set<string>();
  for (const attendance of attendances) {
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
        sessionDetails: "",
      };
    }

    const sessionType = session?.sessionType;
    const payout = payouts[fellow.visibleId];
    const cacheKey = `${fellow.visibleId}-${attendance.schoolId}-${session?.sessionType}`;

    if (sessionType && payout && !payoutCache.has(cacheKey)) {
      const isPreSession = sessionType === "s0";
      const isMainSession = ["s1", "s2", "s3", "s4"].includes(sessionType);

      if (isPreSession || isMainSession) {
        payout.kesPayoutAmount += isPreSession
          ? PRE_SESSION_COMPENSATION
          : MAIN_SESSION_COMPENSATION;
        isPreSession ? payout.preSessionCount++ : payout.mainSessionCount++;

        let sessionDetail = `${session.school.schoolName.trim()}-${sessionDisplayName(
          session.sessionType,
        )}`;
        if (attendance.delayedPaymentRequests?.length > 0) {
          sessionDetail += "(Delayed)";
        }

        let separator = payout.sessionDetails === "" ? "" : "/";
        payout.sessionDetails += separator + sessionDetail;
        payoutCache.add(cacheKey);
      } else {
        throw new Error(`Invalid session type: ${sessionType}`);
      }
    }
  }

  return { payouts };
};
