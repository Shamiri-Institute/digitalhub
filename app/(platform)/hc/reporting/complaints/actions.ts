"use server";

import { ComplaintSchema } from "#/app/(platform)/hc/reporting/complaints/schema";
import { currentHubCoordinator } from "#/app/auth";
import { db } from "#/lib/db";
import { Prisma } from "@prisma/client";

export type HubReportComplaintsType = Awaited<
  ReturnType<typeof loadHubPaymentComplaints>
>[number];

export async function loadHubPaymentComplaints() {
  const hubCoordinator = await currentHubCoordinator();

  if (!hubCoordinator) {
    throw new Error("Unauthorised user");
  }

  const fellows = await db.fellow.findMany({
    where: {
      hubId: hubCoordinator.assignedHubId,
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
          SpecialApprovalRequests: true,
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

    return {
      fellowName: fellow.fellowName,
      hub: fellow?.hub?.hubName,
      supervisorName: fellow.supervisor?.supervisorName,
      specialSession: specialSessionCount(fellow.fellowAttendances),
      preVsMain: `${preCount} - pre | ${mainCount} - main`,
      trainingSupervision: `${trainingCount} - T | ${supervisionCount} - SV`,
      paidAmount: totalPaidAmount,
      totalAmount: totalAmount,
      complaints: fellow.fellowAttendances.map((attendance) => {
        const payout = attendance.PayoutStatements[0];
        const specialRequest = attendance.SpecialApprovalRequests[0];

        return {
          id: attendance.id,
          dateOfComplaint: specialRequest?.createdAt ?? "N/A",
          reasonForComplaint: "N/A", //we need to add this to the schema
          statement: payout?.notes ?? "N/A",
          difference: payout?.amount ?? "N/A",
          confirmedAmountReceived: payout?.amount ?? "N/A",
          status: specialRequest?.status ?? "N/A",
          mpesaName: fellow?.mpesaName ?? "N/A",
          mpesaNumber: payout?.mpesaNumber ?? fellow?.mpesaNumber ?? "N/A",
          fellowName: fellow.fellowName,
          paidAmount: totalAmount,
          noOfSpecialSessions: specialSessionCount(fellow.fellowAttendances),
          noOfTrainingSessions: trainingCount,
          noOfSupervisionSessions: supervisionCount,
          noOfPreSessions: preCount,
          noOfMainSessions: mainCount,
          confirmedTotalReceived: totalPaidAmount,
          complaintReason: "N/A", //we need to add this to the schema
          comments: "N/A", //we need to add this to the schema
          reasonForAccepting: "N/A", //we need to add this to the schema
          reasonForRejecting: "N/A", // we need to add this to the schema
          allFellowsInHub: fellows,
        };
      }),
    };
  });
}

function calculateAmounts(attendances: FellowAttendance[]) {
  let totalAmount = 0;
  let totalPaidAmount = 0;

  attendances?.forEach((a) => {
    const sessionAmount = a?.session?.session?.amount || 0;
    totalAmount += sessionAmount;
    if (a?.paymentInitiated) {
      totalPaidAmount += sessionAmount;
    }
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
  };
}>;

export async function rejectComplaint(data: {
  id: number;
  reason: string;
  formData: ComplaintSchema;
}) {
  const hubCoordinator = await currentHubCoordinator();
  if (!hubCoordinator) {
    throw new Error("Unauthorised user");
  }
  try {
    // will be in a separate PR for actions
    // do we update the payout statement here then the special approval request
    // since the figures will be different if the complaint is approved and the values are updated

    return {
      success: true,
      message: "Complaint has been rejected",
    };
  } catch (error) {
    console.log(error);
    return {
      success: false,
      message: "Something went wrong, please try again",
    };
  }
}

export async function approveComplaint(data: {
  id: number;
  reason: string;
  formData: ComplaintSchema;
}) {
  const hubCoordinator = await currentHubCoordinator();
  if (!hubCoordinator) {
    throw new Error("Unauthorised user");
  }

  try {
    // will be in a separate PR for actions
    // do we update the payout statement here then the special approval request
    // since the figures will be different if the complaint is approved and the values are updated

    return {
      success: true,
      message: `Complaint has been approved`,
    };
  } catch (error) {
    console.log(error);
    return {
      success: false,
      message: "Something went wrong, please try again",
    };
  }
}
