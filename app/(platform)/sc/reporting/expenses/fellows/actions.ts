"use server";

import { currentSupervisor } from "#/app/auth";
import { db } from "#/lib/db";
import { Prisma } from "@prisma/client";

export type SupervisorFellowsAttendancesType = Awaited<
  ReturnType<typeof loadSupervisorFellowAttendance>
>[number];

export async function loadSupervisorFellowAttendance() {
  const currentSupervisorData = await currentSupervisor();

  if (!currentSupervisorData) {
    throw new Error("Unauthorised user");
  }

  const fellows = await db.fellow.findMany({
    where: {
      supervisorId: currentSupervisorData.id,
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
          PayoutStatements: true,
        },
      },
    },
  });

  return fellows.map((fellow) => {
    const { totalAmount, totalPaidAmount } = calculateAmounts(
      fellow.fellowAttendances,
    );

    const { preCount, mainCount, supervisionCount, trainingCount } =
      calculateSessionCounts(fellow.fellowAttendances);

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

  attendances?.forEach((a) => {
    // Sum all payout amounts for this attendance
    a.PayoutStatements?.forEach((payout) => {
      totalAmount += payout.amount;
      if (a?.paymentInitiated) {
        totalPaidAmount += payout.amount;
      }
    });
  });

  return { totalAmount, totalPaidAmount };
}

function specialSessionCount(attendances: FellowAttendance[]) {
  return (
    attendances.filter(
      (attendance) => attendance.session?.session?.sessionType === "SPECIAL",
    ).length || 0
  );
}

function calculateSessionCounts(fellowAttendances: FellowAttendance[]) {
  const { preCount, mainCount, supervisionCount, trainingCount } =
    fellowAttendances.reduce(
      (counts, attendance) => {
        const sessionLabel = attendance.session?.session?.sessionLabel;
        const sessionType = attendance.session?.session?.sessionType;

        // For pre and main session counts
        if (sessionLabel === "s0") {
          counts.preCount += 1;
        } else if (["s1", "s2", "s3", "s4"].includes(sessionLabel ?? "")) {
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

export async function submitPaymentReversal(data: {
  id: number;
  name: string;
}) {
  const currentSupervisorData = await currentSupervisor();
  if (!currentSupervisorData) {
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
  const currentSupervisorData = await currentSupervisor();
  if (!currentSupervisorData) {
    throw new Error("Unauthorised user");
  }
  // will be in a separate PR for actions
  return {
    success: true,
    message: `Repayment request for ${data.name} has been submitted`,
  };
}
