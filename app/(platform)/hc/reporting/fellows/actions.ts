"use server";

import { currentHubCoordinator } from "#/app/auth";
import { db } from "#/lib/db";
import { Prisma } from "@prisma/client";

export type HubFellowsAttendancesType = Awaited<
  ReturnType<typeof loadHubFellowAttendance>
>[number];

export async function loadHubFellowAttendance() {
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
        },
      },
    },
  });

  return fellows.map((fellow) => ({
    fellowName: fellow.fellowName,
    hub: fellow?.hub?.hubName,
    supervisorName: fellow.supervisor?.supervisorName,
    specialSession: specialSessionCount(fellow.fellowAttendances),
    preVsMain: calculatePreVsMain(fellow.fellowAttendances),
    trainingSupervision: calculateTrainingSupervision(fellow.fellowAttendances),
    paidAmount: calculatePaidAmount(fellow.fellowAttendances),
    totalAmount: calculateTotalAmount(fellow.fellowAttendances),
    attendances: fellow.fellowAttendances.map((attendance) => ({
      id: attendance.id,
      fellowName: fellow.fellowName,
      session: attendance?.session?.session?.sessionName,
      mpesaNo: fellow.mpesaNumber,
      schoolVenue: attendance.school?.schoolName, // School or venue,defaulting to venue, we were to track the venue of the session
      dateOfAttendance: attendance?.session?.sessionDate,
      dateMarked: attendance?.updatedAt, // ? should this be tracked?
      group: attendance.group?.groupName,
      amount: attendance?.session?.session?.amount || 0,
      status: attendance.attended ? "Attended" : "Absent",
    })),
  }));
}

function calculatePaidAmount(attendances: FellowAttendance[]) {
  // this should have paymentInitiated as true
  return attendances
    .filter((a) => a?.paymentInitiated)
    .reduce((total, a) => total + (a?.session?.session?.amount || 0), 0);
}

function calculateTotalAmount(attendances: FellowAttendance[]) {
  // total amount
  return (
    attendances.reduce(
      (total, a) => total + (a.session?.session?.amount || 0),
      0,
    ) || 0
  );
}

function specialSessionCount(attendances: FellowAttendance[]) {
  return (
    attendances.filter(
      (attendance) => attendance.session?.session?.sessionType === "SPECIAL",
    ).length || 0
  );
}

function calculatePreVsMain(fellowAttendances: FellowAttendance[]) {
  const preCount = fellowAttendances.filter(
    (attendance) => attendance.session?.session?.sessionLabel === "s0", //pre
  ).length;
  const mainCount = fellowAttendances.filter((attendance: FellowAttendance) =>
    ["s1", "s2", "s3", "s4"].includes(
      attendance?.session?.session?.sessionLabel ?? "",
    ),
  ).length;

  return `${preCount} - pre | ${mainCount} - main`;
}

function calculateTrainingSupervision(fellowAttendances: FellowAttendance[]) {
  const supervisionCount = fellowAttendances.filter(
    (attendance) => attendance.session?.session?.sessionType === "SUPERVISION",
  ).length;
  const trainingCount = fellowAttendances.filter(
    (attendance) => attendance.session?.session?.sessionType === "TRAINING",
  ).length;

  return `${trainingCount} - T | ${supervisionCount} - SV`;
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

export async function submitPaymentReversal(data: {
  id: number;
  name: string;
}) {
  const hubCoordinator = await currentHubCoordinator();
  if (!hubCoordinator) {
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
  const hubCoordinator = await currentHubCoordinator();
  if (!hubCoordinator) {
    throw new Error("Unauthorised user");
  }
  // will be in a separate PR for actions
  return {
    success: true,
    message: `Repayment request for ${data.name} has been submitted`,
  };
}
