"use server";

import { ComplaintSchema } from "#/app/(platform)/hc/reporting/expenses/complaints/schema";
import { currentSupervisor } from "#/app/auth";
import { db } from "#/lib/db";
import { Prisma } from "@prisma/client";

export type FellowReportComplaintsType = Awaited<
  ReturnType<typeof loadFellowPaymentComplaints>
>[number];

export async function loadFellowPaymentComplaints() {
  const supervisor = await currentSupervisor();

  if (!supervisor) {
    throw new Error("Unauthorised user");
  }

  const fellows = await db.fellow.findMany({
    where: {
      supervisorId: supervisor.id,
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
          fellowPaymentComplaints: true,
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
      complaints: fellow.fellowAttendances.flatMap((attendance) => {
        return attendance.fellowPaymentComplaints.map((complaint) => ({
          id: complaint.id,
          dateOfComplaint: complaint?.dateOfComplaint,
          reasonForComplaint: complaint.reason,
          statement: complaint?.statement,
          difference: complaint?.differenceInAmount,
          confirmedAmountReceived: complaint?.confirmedAmountReceived,
          status: complaint?.status,
          mpesaName: fellow?.mpesaName,
          mpesaNumber: fellow.mpesaNumber,
          fellowName: fellow.fellowName,
          paidAmount: totalAmount,
          noOfSpecialSessions: specialSessionCount(fellow.fellowAttendances),
          noOfTrainingSessions: trainingCount,
          noOfSupervisionSessions: supervisionCount,
          noOfPreSessions: preCount,
          noOfMainSessions: mainCount,
          confirmedTotalReceived: totalPaidAmount,
          comments: complaint.comments,
          reasonForAccepting: complaint.reasonForAcceptance,
          reasonForRejecting: complaint.reasonForRejection,
          allFellowsInHub: fellows,
        }));
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
  id: string;
  formData: ComplaintSchema;
}) {
  const supervisor = await currentSupervisor();
  if (!supervisor) {
    throw new Error("Unauthorised user");
  }
  try {
    await db.fellowPaymentComplaints.update({
      where: {
        id: data.id,
      },
      data: {
        status: "REJECTED",
        reasonForRejection: data.formData.reasonForRejecting,
        confirmedAmountReceived: data.formData.confirmedAmountReceived,
        comments: data.formData.comments,
        reason: data.formData.reasonForComplaint,
        // TODO: statement should be link to uploaded mpesa statement (defaulting to "mpesa statement" for now) We will need to update this when we know how processed payouts will be stored
        statement: "mpesa statement",
      },
    });
    return {
      success: true,
      message: "Complaint has been rejected",
    };
  } catch (error) {
    console.error(error);
    return {
      success: false,
      message: "Something went wrong, please try again",
    };
  }
}

export async function approveComplaint(data: {
  id: string;
  formData: ComplaintSchema;
}) {
  const supervisor = await currentSupervisor();
  if (!supervisor) {
    throw new Error("Unauthorised user");
  }

  try {
    await db.fellowPaymentComplaints.update({
      where: {
        id: data.id,
      },
      data: {
        status: "APPROVED",
        reasonForAcceptance: data.formData.reasonForAccepting,
        confirmedAmountReceived: data.formData.confirmedAmountReceived,
        comments: data.formData.comments,
        reason: data.formData.reasonForComplaint,
        // TODO: statement should be link to uploaded mpesa statement (defaulting to "mpesa statement" for now) We will need to update this when we know how processed payouts will be stored
        statement: "mpesa statement",
      },
    });

    return {
      success: true,
      message: `Complaint has been approved`,
    };
  } catch (error) {
    console.error(error);
    return {
      success: false,
      message: "Something went wrong, please try again",
    };
  }
}
