import { format } from "date-fns";
import * as fastcsv from "fast-csv";
import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import { z } from "zod";

import { emailPayoutReport } from "#/app/api/payouts/generate/email-payout-report";
import type { PayoutDetail } from "#/app/api/payouts/generate/types";
import { CURRENT_PROJECT_ID } from "#/lib/constants";
import { db } from "#/lib/db";
import { notEmpty } from "#/lib/utils";
import { calculatePayouts } from "./calculate-payouts";

export const revalidate = 0;

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const params = z
    .object({
      day: z.enum(["M", "R"]),
      effectiveDate: z.date().optional().default(new Date()),
    })
    .safeParse({
      day: searchParams.get("day"),
      effectiveDate: searchParams.get("effectiveDate") ?? undefined,
    });
  if (!params.success) {
    return NextResponse.json({ error: "Invalid day" }, { status: 400 });
  }
  const { day, effectiveDate } = params.data;
  const forceSend = searchParams.get("send") === "1";
  const saveFile = searchParams.get("save") === "1";

  try {
    const totalPayoutReport = await calculatePayouts({
      day,
      effectiveDate,
    });

    const csvBuffer = await generateCsvBuffer(totalPayoutReport.payoutDetails);
    const { payoutPeriod } = totalPayoutReport;
    const fileName = `total-payouts-${format(
      payoutPeriod.startDate,
      "yyyy-MM-dd",
    )}-to-${format(payoutPeriod.endDate, "yyyy-MM-dd")}.csv`;
    if (saveFile) {
      fs.writeFileSync(fileName, csvBuffer);
    }

    const sourceEmail = '"Shamiri Digital Hub" <tech@shamiri.institute>';
    const destinationEmails = ["ngatti@shamiri.institute"];
    const ccEmails = [
      "waweru@shamiri.institute",
      "ngatia@shamiri.institute",
      "nyareso@shamiri.institute",
      "daya@shamiri.institute",
      "tech@shamiri.institute",
    ];

    await emailPayoutReport({
      sourceEmail,
      destinationEmails,
      ccEmails,
      subject: `Payouts for sessions ${format(
        payoutPeriod.startDate,
        "yyyy-MM-dd",
      )} to ${format(payoutPeriod.endDate, "yyyy-MM-dd")}`,
      bodyText: `Please find the attached payouts CSV.`,
      attachmentName: `total-payouts-${format(
        payoutPeriod.startDate,
        "yyyy-MM-dd",
      )}-to-${format(payoutPeriod.endDate, "yyyy-MM-dd")}.csv`,
      attachmentContent: csvBuffer.toString(),
      payoutReport: totalPayoutReport,
      forceSend,
    });

    console.log(
      `Emailed total payout report to ${destinationEmails.join(", ")} and cc'ed ${ccEmails.join(", ")}`,
    );

    const supervisors = await fetchSupervisors();

    for (const supervisor of supervisors) {
      const supervisorPayoutReport = await calculatePayouts({
        day,
        effectiveDate,
        supervisorId: supervisor.id,
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
      const fileName = `supervisor-${supervisor.visibleId}-payouts-${format(
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
        noEmailWarnings += ` No hub coordinator emailss for ${supervisor.visibleId}. ${hubCoordinatorVisibleIds.join(", ")}.`;
      }

      const destinationEmails = [supervisor.supervisorEmail].filter(notEmpty);
      const ccEmails = [...hubCoordinatorEmails, "tech@shamiri.institute"];

      await emailPayoutReport({
        sourceEmail,
        destinationEmails,
        ccEmails,
        subject: `Payouts for ${supervisor.supervisorName}'s fellows' sessions ${format(
          payoutPeriod.startDate,
          "yyyy-MM-dd",
        )} to ${format(payoutPeriod.endDate, "yyyy-MM-dd")}`,
        bodyText: `Please find the attached payouts CSV for ${supervisor.supervisorName}'s fellows.${noEmailWarnings}`,
        attachmentName: fileName,
        attachmentContent: csvBuffer.toString(),
        payoutReport: supervisorPayoutReport,
        forceSend,
      });

      console.log(
        `Emailed supervisor ${supervisor.visibleId} payout report to ${supervisor.supervisorEmail} and cc'ed ${hubCoordinatorEmails.join(", ")}`,
      );
    }

    return NextResponse.json({
      message: `Tabulated ${totalPayoutReport.payoutDetails.length} payouts`,
      effectiveDate,
      payoutReport: totalPayoutReport,
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    } else {
      return NextResponse.json(
        { error: "An unknown error occurred" },
        { status: 500 },
      );
    }
  }
}

async function fetchSupervisors() {
  const supervisors = await db.supervisor.findMany({
    where: {
      hub: {
        projectId: CURRENT_PROJECT_ID,
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
