"use server";

import { currentOpsUser } from "#/app/auth";
import { CURRENT_PROJECT_ID } from "#/lib/constants";
import { db } from "#/lib/db";
import type { Prisma } from "@prisma/client";

export type HubFellowsAttendancesType = Awaited<
  ReturnType<typeof loadHubsFellowAttendance>
>[number];

export async function loadHubsFellowAttendance() {
  const opsUser = await currentOpsUser();

  if (!opsUser) {
    throw new Error("Unauthorised user");
  }

  const fellows = await db.fellow.findMany({
    where: {
      hub: {
        projectId: CURRENT_PROJECT_ID,
      },
    },
    include: {
      hub: {
        select: {
          hubName: true,
        },
      },
      supervisor: {
        select: {
          supervisorName: true,
        },
      },
      fellowAttendances: {
        include: {
          session: {
            include: {
              session: true,
            },
          },
          group: true,
          school: {
            select: {
              schoolName: true,
            },
          },
          PayoutStatements: {
            orderBy: {
              createdAt: "asc",
            },
          },
        },
      },
    },
  });

  return fellows.map((fellow) => {
    const { totalAmount, totalPaidAmount } = calculateAmounts(fellow.fellowAttendances);

    const { preCount, mainCount, supervisionCount, trainingCount } = calculateSessionCounts(
      fellow.fellowAttendances,
    );

    const payoutStatements = fellow.fellowAttendances.flatMap((attendance) =>
      attendance.PayoutStatements.map((payout) => ({
        id: payout.id,
        fellowName: fellow.fellowName,
        session: attendance?.session?.session?.sessionLabel,
        mpesaNo: fellow.mpesaNumber,
        schoolVenue: attendance.school?.schoolName,
        dateOfAttendance: attendance?.session?.sessionDate,
        dateMarked: attendance?.updatedAt,
        group: attendance.group?.groupName,
        amount: payout.amount,
        status: attendance.attended ? "Attended" : "Absent",
        payoutReason: payout.reason,
        payoutNotes: payout.notes,
        executedAt: payout.executedAt,
        confirmedAt: payout.confirmedAt,
      })),
    );

    return {
      fellowName: fellow.fellowName,
      hub: fellow?.hub?.hubName,
      supervisorName: fellow.supervisor?.supervisorName,
      specialSession: specialSessionCount(fellow.fellowAttendances),
      preVsMain: `${preCount} - pre | ${mainCount} - main`,
      trainingSupervision: `${trainingCount} - T | ${supervisionCount} - SV`,
      paidAmount: totalPaidAmount,
      totalAmount: totalAmount,
      attendances: payoutStatements,
    };
  });
}

function calculateAmounts(attendances: FellowAttendance[]) {
  let totalAmount = 0;
  let totalPaidAmount = 0;

  attendances?.forEach((attendance) => {
    attendance.PayoutStatements?.forEach((payout) => {
      totalAmount += payout.amount;
      if (payout.confirmedAt) {
        totalPaidAmount += payout.amount;
      }
    });
  });

  return { totalAmount, totalPaidAmount };
}

function specialSessionCount(attendances: FellowAttendance[]) {
  return (
    attendances.filter((attendance) => attendance.session?.session?.sessionType === "SPECIAL")
      .length || 0
  );
}

function calculateSessionCounts(fellowAttendances: FellowAttendance[]) {
  const { preCount, mainCount, supervisionCount, trainingCount } = fellowAttendances.reduce(
    (counts, attendance) => {
      const sessionLabel = attendance.session?.session?.sessionLabel;
      const sessionType = attendance.session?.session?.sessionType;

      // For pre and main session counts
      if (sessionLabel === "Pre-session") {
        counts.preCount += 1;
      } else if (
        ["Session 1", "Session 2", "Session 3", "Session 4"].includes(sessionLabel ?? "")
      ) {
        counts.mainCount += 1;
      }

      // For training and supervision session counts
      if (sessionType === "SUPERVISION") {
        counts.supervisionCount += 1;
      } else if (sessionType === "TRAINING") {
        counts.trainingCount += 1;
      }

      return counts;
    },
    { preCount: 0, mainCount: 0, supervisionCount: 0, trainingCount: 0 },
  );

  return { preCount, mainCount, supervisionCount, trainingCount };
}

type FellowAttendance = Prisma.FellowAttendanceGetPayload<{
  include: {
    session: {
      include: {
        session: true;
      };
    };
    PayoutStatements: true;
  };
}>;

export async function submitPaymentReversal(data: { id: number; name: string }) {
  const opsUser = await currentOpsUser();
  if (!opsUser) {
    throw new Error("Unauthorised user");
  }
  // will be in a separate PR for actions
  return {
    success: true,
    message: `Payment for ${data.name} has been reversed`,
  };
}

export async function submitRequestRepayment(data: {
  id: number;
  name: string;
  mpesaNumber: string;
}) {
  const opsUser = await currentOpsUser();
  if (!opsUser) {
    throw new Error("Unauthorised user");
  }
  // will be in a separate PR for actions
  return {
    success: true,
    message: `Repayment request for ${data.name} has been submitted`,
  };
}
