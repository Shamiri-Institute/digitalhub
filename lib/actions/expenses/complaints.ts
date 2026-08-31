import type { Prisma } from "@prisma/client";
import {
  type ComplaintFormSchema,
  type CreateComplaintSchema,
  hasDownloadableStatement,
} from "#/components/common/expenses/complaints/schema";
import { db } from "#/lib/db";
import { getPresignedUrl } from "#/lib/s3";

/**
 * Shared core for the fellow payment-complaints report. Each role's
 * actions.ts resolves its own auth and passes the fellow scope it is
 * allowed to see; everything below the scope is identical across roles.
 */
export async function loadPaymentComplaints(where: Prisma.FellowWhereInput) {
  const fellows = await db.fellow.findMany({
    where,
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
          PayoutStatements: {
            select: { amount: true, executedAt: true },
          },
        },
      },
    },
  });

  return Promise.all(
    fellows.map(async (fellow) => {
      const { totalAmount, totalPaidAmount } = calculateAmounts(fellow.fellowAttendances);

      const { preCount, mainCount, supervisionCount, trainingCount } = calculateSessionCounts(
        fellow.fellowAttendances,
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
        complaints: await Promise.all(
          fellow.fellowAttendances.flatMap((attendance) =>
            attendance.fellowPaymentComplaints.map(async (complaint) => ({
              id: complaint.id,
              dateOfComplaint: complaint?.dateOfComplaint,
              reasonForComplaint: complaint.reason,
              statement: complaint?.statement,
              // Statements live in a private bucket, so the download link is a
              // presigned URL. Signing is local, so it costs no round trip.
              statementUrl: await presignStatement(complaint.statement),
              difference: complaint?.differenceInAmount,
              confirmedAmountReceived: complaint?.confirmedAmountReceived,
              status: complaint?.status,
              mpesaName: fellow?.mpesaName,
              mpesaNumber: fellow.mpesaNumber,
              fellowName: fellow.fellowName,
              // The payout this complaint is about, not the fellow's all-time
              // total: the review dialog must show the same basis the create used
              // or approving would silently rewrite differenceInAmount.
              paidAmount:
                payoutTotalForAttendance(attendance, fellow.fellowAttendances) ?? totalAmount,
              noOfSpecialSessions: specialSessionCount(fellow.fellowAttendances),
              noOfTrainingSessions: trainingCount,
              noOfSupervisionSessions: supervisionCount,
              noOfPreSessions: preCount,
              noOfMainSessions: mainCount,
              confirmedTotalReceived: totalPaidAmount,
              comments: complaint.comments,
              reasonForAccepting: complaint.reasonForAcceptance,
              reasonForRejecting: complaint.reasonForRejection,
            })),
          ),
        ),
      };
    }),
  );
}

/**
 * A signing failure should cost the row its download link, not take the whole
 * complaints report down with it. This report never touched S3 before.
 */
async function presignStatement(statement: string) {
  if (!hasDownloadableStatement(statement)) {
    return null;
  }

  try {
    return await getPresignedUrl(statement, "uploads");
  } catch (error) {
    console.error("Could not presign complaint statement", error);
    return null;
  }
}

/**
 * What the payout that covered this attendance paid the fellow in total. A
 * complaint is about a payout, so this is the basis its difference is measured
 * against. Null when the attendance was never part of an executed payout.
 */
function payoutTotalForAttendance(
  attendance: { PayoutStatements: PayoutStatementAmount[] },
  attendances: { PayoutStatements: PayoutStatementAmount[] }[],
) {
  const executedAt = attendance.PayoutStatements.find(
    (statement) => statement.executedAt,
  )?.executedAt;

  if (!executedAt) {
    return null;
  }

  return attendances
    .flatMap((each) => each.PayoutStatements)
    .filter((statement) => statement.executedAt?.getTime() === executedAt.getTime())
    .reduce((total, statement) => total + statement.amount, 0);
}

type PayoutStatementAmount = { amount: number; executedAt: Date | null };

/**
 * The total a payout paid a fellow, read from the payout statements. Both the
 * create and the review derive the difference from this rather than from the
 * client's paidAmount field, so the figure cannot be forged and cannot change
 * meaning between raising a complaint and approving it.
 */
async function payoutTotal(fellowId: string, executedAt: Date) {
  const { _sum } = await db.payoutStatements.aggregate({
    where: { fellowId, executedAt },
    _sum: { amount: true },
  });

  return _sum.amount;
}

/**
 * Approves or rejects a complaint. Callers resolve the role auth and pass the
 * fellow scope they are allowed to act within; the update itself is identical
 * across roles.
 */
export async function resolveComplaint(
  data: { id: string; formData: ComplaintFormSchema; scope: Prisma.FellowWhereInput },
  status: "APPROVED" | "REJECTED",
) {
  try {
    // A complaint id on its own is not proof of access, so confirm the
    // complaint belongs to a fellow inside the caller's scope before mutating.
    const complaint = await db.fellowPaymentComplaints.findFirst({
      where: {
        id: data.id,
        fellowAttendance: { fellow: data.scope },
      },
      select: {
        id: true,
        fellowAttendance: {
          select: {
            fellowId: true,
            PayoutStatements: { select: { executedAt: true } },
          },
        },
      },
    });

    if (!complaint) {
      return {
        success: false,
        message: "Complaint not found",
      };
    }

    const executedAt = complaint.fellowAttendance.PayoutStatements.find(
      (statement) => statement.executedAt,
    )?.executedAt;
    const paidAmount = executedAt
      ? await payoutTotal(complaint.fellowAttendance.fellowId, executedAt)
      : null;

    await db.fellowPaymentComplaints.update({
      where: {
        id: data.id,
      },
      data: {
        status,
        ...(status === "APPROVED"
          ? { reasonForAcceptance: data.formData.reasonForAccepting }
          : { reasonForRejection: data.formData.reasonForRejecting }),
        confirmedAmountReceived: data.formData.confirmedAmountReceived,
        // Only ever derived from the payout. If this complaint predates payout
        // statements there is no trustworthy basis, so the stored difference is
        // left as it was rather than recomputed from a client-supplied figure.
        ...(paidAmount === null
          ? {}
          : {
              differenceInAmount: paidAmount - data.formData.confirmedAmountReceived,
            }),
        comments: data.formData.comments,
        reason: data.formData.reasonForComplaint,
        // statement is deliberately left alone. It is the fellow's evidence,
        // supplied when the complaint is raised, and the Statement column
        // downloads it — writing a placeholder here destroyed that link.
      },
    });
    return {
      success: true,
      message:
        status === "APPROVED" ? "Complaint has been approved" : "Complaint has been rejected",
    };
  } catch (error) {
    console.error(error);
    return {
      success: false,
      message: "Something went wrong, please try again",
    };
  }
}

/**
 * The details the add-complaint dialog prefills once a fellow is chosen. Uses
 * the same helpers as loadPaymentComplaints so the add and review dialogs show
 * the same session counts for the same fellow.
 *
 * The paid amount is deliberately not returned: the complaint is about one
 * payout, so the dialog uses that payout's amount for the fellow rather than
 * their all-time total.
 */
export async function loadComplaintContext(data: {
  fellowId: string;
  scope: Prisma.FellowWhereInput;
}) {
  const fellow = await db.fellow.findFirst({
    where: { AND: [{ id: data.fellowId }, data.scope] },
    include: {
      fellowAttendances: {
        include: { session: { include: { session: true } } },
      },
    },
  });

  if (!fellow) {
    return null;
  }

  const { preCount, mainCount, supervisionCount, trainingCount } = calculateSessionCounts(
    fellow.fellowAttendances,
  );

  return {
    mpesaName: fellow.mpesaName ?? "",
    mpesaNumber: fellow.mpesaNumber ?? "",
    noOfTrainingSessions: trainingCount,
    noOfSupervisionSessions: supervisionCount,
    noOfPreSessions: preCount,
    noOfMainSessions: mainCount,
    noOfSpecialSessions: specialSessionCount(fellow.fellowAttendances),
  };
}

/**
 * Raises a complaint against a payout. Callers resolve the role auth and pass
 * the fellow scope they are allowed to act within, exactly as for
 * resolveComplaint.
 *
 * FellowPaymentComplaints hangs off a single FellowAttendance. The complaint is
 * filed against a payout, so the attendance is taken from the payout statements
 * for that fellow and payout date rather than guessed from their latest session.
 */
export async function createPaymentComplaint(data: {
  fellowId: string;
  payoutDate: Date;
  formData: CreateComplaintSchema;
  scope: Prisma.FellowWhereInput;
}) {
  try {
    const fellow = await db.fellow.findFirst({
      where: { AND: [{ id: data.fellowId }, data.scope] },
      select: { id: true },
    });

    if (!fellow) {
      return {
        success: false,
        message: "Fellow not found",
      };
    }

    const statements = await db.payoutStatements.findMany({
      where: { fellowId: fellow.id, executedAt: data.payoutDate },
      // Ordered by attendance so the complaint always hangs off the same row:
      // statements written in one transaction share created_at, so ordering by
      // that would pick an arbitrary attendance and defeat the guard below.
      orderBy: { fellowAttendanceId: "asc" },
      select: { fellowAttendanceId: true, amount: true },
    });

    const fellowAttendanceId = statements[0]?.fellowAttendanceId;

    if (fellowAttendanceId === undefined) {
      return {
        success: false,
        message: "No payout found for this fellow on that payout date",
      };
    }

    // Nothing in the schema stops two identical complaints, and a double submit
    // would give reviewers two rows to resolve separately. Keyed to every
    // attendance in the payout, not just the one this complaint will hang off.
    const existing = await db.fellowPaymentComplaints.findFirst({
      where: {
        fellowAttendanceId: { in: statements.map((statement) => statement.fellowAttendanceId) },
        status: "PENDING",
      },
      select: { id: true },
    });

    if (existing) {
      return {
        success: false,
        message: "There is already an open complaint for this fellow on this payout",
      };
    }

    const paidAmount = statements.reduce((total, statement) => total + statement.amount, 0);

    await db.fellowPaymentComplaints.create({
      data: {
        fellowAttendanceId,
        dateOfComplaint: new Date(),
        reason: data.formData.reasonForComplaint,
        // The column is NOT NULL, so "no statement yet" is stored as empty and
        // the Statement column checks for it before offering a download.
        statement: data.formData.statement,
        confirmedAmountReceived: data.formData.confirmedAmountReceived,
        differenceInAmount: paidAmount - data.formData.confirmedAmountReceived,
        comments: data.formData.comments,
      },
    });

    return {
      success: true,
      message: "Complaint has been raised",
    };
  } catch (error) {
    console.error(error);
    return {
      success: false,
      message: "Something went wrong, please try again",
    };
  }
}

function calculateAmounts(attendances: FellowAttendance[]) {
  let totalAmount = 0;
  let totalPaidAmount = 0;

  attendances?.forEach((a) => {
    const sessionAmount = a?.session?.session?.amount || 0;
    totalAmount += sessionAmount;
    if (a?.processedAt) {
      totalPaidAmount += sessionAmount;
    }
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
