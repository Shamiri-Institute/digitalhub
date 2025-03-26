import * as Sentry from "@sentry/nextjs";
import { format } from "date-fns";
import * as fastcsv from "fast-csv";
import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import { z } from "zod";

import { calculateRepayments } from "#/app/api/payouts/generate/calculate-repayments";
import {
  emailPayoutReport,
  emailRepaymentReport,
} from "#/app/api/payouts/generate/email-report";
import type { PayoutDetail } from "#/app/api/payouts/generate/types";
import { parseRelativeDate } from "#/app/api/utils";
import { db } from "#/lib/db";
import { notEmpty } from "#/lib/utils";
import { calculatePayouts } from "./calculate-payouts";

export const revalidate = 0;
export const maxDuration = 300;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", {
      status: 401,
    });
  }

  const { searchParams } = request.nextUrl;
  const params = z
    .object({
      day: z.enum(["M", "R"]),
      effectiveDate: z.string().optional().default(""),
      implementerId: z.string(),
    })
    .safeParse({
      day: searchParams.get("day"),
      effectiveDate: searchParams.get("effectiveDate") ?? undefined,
      implementerId: searchParams.get("implementerId"),
    });
  if (!params.success) {
    console.log(params.error);
    return NextResponse.json({ error: "Bad Request" }, { status: 400 });
  }
  const { day, implementerId } = params.data;
  const forceSend = searchParams.get("forceSend") === "1";
  const saveFile = searchParams.get("saveFile") === "1";
  const dryRun = searchParams.get("dryRun") === "1";

  const effectiveDateParam = params.data.effectiveDate;
  let effectiveDate: Date;
  if (
    effectiveDateParam.startsWith("NEXT_") ||
    effectiveDateParam.startsWith("PREV_")
  ) {
    effectiveDate = parseRelativeDate(effectiveDateParam);
  } else if (effectiveDateParam) {
    effectiveDate = new Date(effectiveDateParam);
  } else {
    effectiveDate = new Date();
  }

  try {
    const implementer = await db.implementer.findUniqueOrThrow({
      where: { id: implementerId },
      include: {
        hubCoordinators: true,
      },
    });

    const totalPayoutReport = await calculatePayouts({
      day,
      effectiveDate,
      implementerId,
    });
    const { payoutPeriod } = totalPayoutReport;
    const totalCsvFileName = `total-payouts-${implementer.visibleId}-${format(
      payoutPeriod.startDate,
      "yyyy-MM-dd",
    )}-to-${format(payoutPeriod.endDate, "yyyy-MM-dd")}.csv`;
    const totalCsvBuffer = await generateCsv({
      payoutDetails: totalPayoutReport.payoutDetails,
      fileName: totalCsvFileName,
      saveFile,
    });

    const repaymentsPayoutReport = await calculateRepayments({ implementerId });
    const repaymentsCsvFileName = `repayments-${implementer.visibleId}-${format(effectiveDate, "yyyy-MM-dd")}.csv`;
    const repaymentsCsvBuffer = await generateCsv({
      payoutDetails: repaymentsPayoutReport.payoutDetails,
      fileName: repaymentsCsvFileName,
      saveFile,
    });

    const sourceEmail = '"Shamiri Digital Hub" <tech@shamiri.institute>';

    let destinationEmails: string[] = [];
    let ccEmails: string[] = [];

    if (implementer.visibleId === "Imp_1") {
      destinationEmails = ["ngatti@shamiri.institute"];
      ccEmails = [
        "waweru@shamiri.institute",
        "ngatia@shamiri.institute",
        "nyareso@shamiri.institute",
        "daya@shamiri.institute",
        "tech@shamiri.institute",
      ];
    } else {
      destinationEmails = [
        implementer.pointPersonEmail ?? "tech@shamiri.institute",
      ];
      ccEmails = implementer.hubCoordinators
        .map((coordinator) => coordinator.coordinatorEmail)
        .filter(notEmpty);

      ccEmails.unshift("tech@shamiri.institute");
    }

    await emailPayoutReport({
      sourceEmail,
      destinationEmails,
      ccEmails,
      subject: `Payouts for ${implementer.implementerName} sessions ${format(
        payoutPeriod.startDate,
        "yyyy-MM-dd",
      )} to ${format(payoutPeriod.endDate, "yyyy-MM-dd")}`,
      bodyText: `Please find the attached payouts CSV.`,
      attachmentName: totalCsvFileName,
      attachmentContent: totalCsvBuffer.toString(),
      payoutReport: totalPayoutReport,
      forceSend,
      dryRun,
    });

    console.log(
      `Emailed total payout report for ${implementer.implementerName} to ${destinationEmails.join(", ")} and cc'ed ${ccEmails.join(", ")}`,
    );

    await emailRepaymentReport({
      sourceEmail,
      destinationEmails,
      ccEmails,
      subject: `Repayments requested for ${implementer.implementerName} as of ${format(effectiveDate, "yyyy-MM-dd")}`,
      bodyText: `Please find the attached repayments CSV.`,
      attachmentName: repaymentsCsvFileName,
      attachmentContent: repaymentsCsvBuffer.toString(),
      repaymentReport: repaymentsPayoutReport,
      forceSend,
      dryRun,
    });

    const supervisors = await fetchSupervisors({ implementerId });
    for (const supervisor of supervisors) {
      const supervisorPayoutReport = await calculatePayouts({
        day,
        effectiveDate,
        supervisorId: supervisor.id,
        implementerId,
      });

      const csvBuffer = await generateCsvBuffer(
        // filter out fellowVisibleId and supervisorVisibleId for supervisor reports
        supervisorPayoutReport.payoutDetails.map((payoutDetail) => {
          const row = { ...payoutDetail };
          // @ts-ignore
          delete row.fellowVisibleId;
          // @ts-ignore
          delete row.supervisorVisibleId;
          return row;
        }),
      );
      const fileName = `implementer-${implementer.visibleId}-supervisor-${supervisor.visibleId}-payouts-${format(
        payoutPeriod.startDate,
        "yyyy-MM-dd",
      )}-to-${format(payoutPeriod.endDate, "yyyy-MM-dd")}.csv`;
      if (saveFile) {
        fs.writeFileSync(fileName, csvBuffer);
      }

      let noEmailWarnings = "";
      if (!supervisor.supervisorEmail) {
        noEmailWarnings = ` No supervisor email for ${supervisor.visibleId}.`;
      }

      const hubCoordinatorEmails =
        supervisor.hub?.coordinators
          ?.map((coordinator) => coordinator.coordinatorEmail)
          .filter(notEmpty) || [];
      if (hubCoordinatorEmails.length === 0) {
        const hubCoordinatorVisibleIds =
          supervisor.hub?.coordinators
            ?.map((coordinator) => coordinator.visibleId)
            .filter(notEmpty) || [];
        noEmailWarnings += ` No hub coordinator emails for ${supervisor.visibleId}. ${hubCoordinatorVisibleIds.join(", ")}.`;
      }

      const destinationEmails = [supervisor.supervisorEmail].filter(notEmpty);
      const ccEmails = [...hubCoordinatorEmails, "tech@shamiri.institute"];

      await emailPayoutReport({
        sourceEmail,
        destinationEmails,
        ccEmails,
        subject: `Payouts for ${implementer.implementerName} ${supervisor.supervisorName}'s fellows' sessions ${format(
          payoutPeriod.startDate,
          "yyyy-MM-dd",
        )} to ${format(payoutPeriod.endDate, "yyyy-MM-dd")}`,
        bodyText: `Please find the attached payouts CSV for ${supervisor.supervisorName}'s fellows.${noEmailWarnings}`,
        attachmentName: fileName,
        attachmentContent: csvBuffer.toString(),
        payoutReport: supervisorPayoutReport,
        forceSend,
        dryRun,
      });

      console.log(
        `Emailed supervisor ${supervisor.visibleId} payout report for ${implementer.implementerName} to ${supervisor.supervisorEmail} and cc'ed ${hubCoordinatorEmails.join(", ")}`,
      );
    }

    if (dryRun) {
      console.warn("Dry run, not marking processed");
    } else {
      await markAttendancesProcessed(totalPayoutReport.attendancesProcessed);
      await markDelayedPaymentsFulfilled(
        totalPayoutReport.delayedPaymentsFulfilled,
      );
      await markRepaymentRequestFulfilled(
        repaymentsPayoutReport.repaymentRequestsFulfilled,
      );
      await markPayoutReconciliationsExecuted(
        totalPayoutReport.reconciliationsFulfilled,
      );
    }

    return NextResponse.json({
      message: `Tabulated ${totalPayoutReport.payoutDetails.length} payouts for ${implementer.implementerName}`,
      effectiveDate,
      payoutReport: totalPayoutReport,
    });
  } catch (error: unknown) {
    Sentry.captureException(error);
    if (error instanceof Error) {
      console.error(error.message);
      return NextResponse.json({ error: error.message }, { status: 400 });
    } else {
      console.error(error);
      return NextResponse.json(
        { error: "An unknown error occurred" },
        { status: 500 },
      );
    }
  }
}

async function fetchSupervisors({ implementerId }: { implementerId: string }) {
  const supervisors = await db.supervisor.findMany({
    where: {
      hub: {
        implementerId,
      },
    },
    include: {
      hub: {
        include: {
          coordinators: true,
        },
      },
    },
  });
  return supervisors;
}

async function generateCsv(options: {
  payoutDetails: PayoutDetail[];
  fileName: string;
  saveFile: boolean;
}): Promise<Buffer> {
  const { payoutDetails, fileName, saveFile } = options;

  const csvBuffer = await generateCsvBuffer(payoutDetails);
  if (saveFile) {
    fs.writeFileSync(fileName, csvBuffer);
  }

  return csvBuffer;
}

async function generateCsvBuffer(
  payoutDetails: PayoutDetail[],
): Promise<Buffer> {
  const csvStream = fastcsv.format({ headers: true });
  payoutDetails.forEach((row) => csvStream.write(row));
  csvStream.end();

  const chunks: Buffer[] = [];
  csvStream.on("data", (chunk: Buffer) => chunks.push(chunk));
  const csvPromise = new Promise<Buffer>((resolve, reject) => {
    csvStream.on("end", () => resolve(Buffer.concat(chunks)));
    csvStream.on("error", reject);
  });

  return await csvPromise;
}

type Processed = {
  id: string;
};

async function markAttendancesProcessed(
  attendancesProcessed: Processed[],
): Promise<void> {
  const ids = attendancesProcessed
    .map((a) => parseInt(a.id))
    .filter((n) => !isNaN(n));
  await db.fellowAttendance.updateMany({
    where: { id: { in: ids } },
    data: { processedAt: new Date() },
  });
}

async function markDelayedPaymentsFulfilled(
  delayedPaymentsFulfilled: Processed[],
): Promise<void> {
  const ids = delayedPaymentsFulfilled.map((dpr) => dpr.id);
  await db.delayedPaymentRequest.updateMany({
    where: { id: { in: ids } },
    data: { fulfilledAt: new Date() },
  });
}

async function markRepaymentRequestFulfilled(
  repaymentRequestsFulfilled: Processed[],
): Promise<void> {
  const ids = repaymentRequestsFulfilled.map((r) => r.id);
  await db.repaymentRequest.updateMany({
    where: { id: { in: ids } },
    data: { fulfilledAt: new Date() },
  });
}

async function markPayoutReconciliationsExecuted(
  reconciliationsExecuted: (Processed & { newPayout?: PayoutDetail })[],
): Promise<void> {
  const ids = reconciliationsExecuted
    .map((r) => parseInt(r.id))
    .filter((n) => !isNaN(n));
  await db.payoutReconciliation.updateMany({
    where: { id: { in: ids } },
    data: { executedAt: new Date() },
  });

  for (const reconciliationExecuted of reconciliationsExecuted) {
    const oldPayoutReconciliation =
      await db.payoutReconciliation.findUniqueOrThrow({
        where: { id: parseInt(reconciliationExecuted.id) },
      });

    if (reconciliationExecuted.newPayout) {
      const newPayout = reconciliationExecuted.newPayout;
      await db.payoutReconciliation.create({
        data: {
          createdAt: new Date(),
          updatedAt: new Date(),
          executedAt: null,
          fellowId: oldPayoutReconciliation.fellowId,
          amount: newPayout.kesPayoutAmount,
          description: newPayout.notes,
          relatedDetails: oldPayoutReconciliation.relatedDetails ?? {},
        },
      });
    }
  }
}
