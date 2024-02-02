import { SendRawEmailCommandInput } from "@aws-sdk/client-ses";
import { format } from "date-fns";
import * as fastcsv from "fast-csv";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { constants } from "#/lib/constants";
import { sendEmailWithAttachment } from "#/lib/ses";
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
      effectiveDate: searchParams.get("effectiveDate"),
    });
  if (!params.success) {
    return NextResponse.json({ error: "Invalid day" }, { status: 400 });
  }
  const { day, effectiveDate } = params.data;

  try {
    const payoutReport = await calculatePayouts({
      day,
      effectiveDate,
    });

    const csvStream = fastcsv.format({ headers: true });
    payoutReport.payoutDetails.forEach((row) => csvStream.write(row));
    csvStream.end();

    const chunks: Buffer[] = [];
    csvStream.on("data", (chunk: Buffer) => chunks.push(chunk));
    await new Promise((resolve, reject) => {
      csvStream.on("end", resolve);
      csvStream.on("error", reject);
    });
    const csvBuffer = Buffer.concat(chunks);

    const emailInput: SendRawEmailCommandInput = {
      Source: '"Shamiri Institute" <tech@shamiri.institute>',
      Destinations: ["tech@shamiri.institute"],
      RawMessage: {
        Data: Buffer.from(
          `From: "Shamiri Institute" <tech@shamiri.institute>\n` +
            `To: tech@shamiri.institute\n` +
            `Subject: Payouts for sessions ${format(
              payoutReport.payoutPeriod.startDate,
              "yyyy-MM-dd",
            )} to ${format(payoutReport.payoutPeriod.endDate, "yyyy-MM-dd")}\n` +
            `MIME-Version: 1.0\n` +
            `Content-Type: multipart/mixed; boundary="NextPart"\n\n` +
            `--NextPart\n` +
            `Content-Type: text/plain\n\n` +
            `Please find the attached payouts CSV.\n\n` +
            `There were ${payoutReport.incompleteRecords.countMissingMpesaName} payouts without Mpesa names and ${payoutReport.incompleteRecords.countMissingMpesaNumber} payouts without Mpesa numbers.\n\n` +
            `The total payout amount is KES ${payoutReport.totalPayoutAmount} and the total payout amount with Mpesa info present is KES ${payoutReport.totalPayoutAmountWithMpesaInfo}.\n\n` +
            `--NextPart--` +
            `Content-Type: text/csv; name="payouts.csv"\n` +
            `Content-Disposition: attachment; filename="payouts.csv"\n\n` +
            csvBuffer.toString() +
            `\n--NextPart--`,
        ),
      },
    };

    const overrideEnv = searchParams.get("sendEmail") === "true";
    await sendEmail({ emailInput, overrideEnv });

    return NextResponse.json({
      message: `Tabulated ${payoutReport.payoutDetails.length} payouts`,
      effectiveDate,
      payoutPeriodStartDate: payoutReport.payoutPeriod.startDate,
      payoutPeriodEndDate: payoutReport.payoutPeriod.endDate,
      payoutsWithoutMpesaName:
        payoutReport.incompleteRecords.countMissingMpesaName,
      payoutsWithoutMpesaNumber:
        payoutReport.incompleteRecords.countMissingMpesaNumber,
      totalPayoutAmount: payoutReport.totalPayoutAmount,
      totalPayoutAmountWithMpesaInfoPresent:
        payoutReport.totalPayoutAmountWithMpesaInfo,
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

async function sendEmail({
  emailInput,
  overrideEnv,
}: {
  emailInput: SendRawEmailCommandInput;
  overrideEnv: boolean;
}) {
  if (constants.NEXT_PUBLIC_ENV === "production" || overrideEnv) {
    await sendEmailWithAttachment(emailInput);
  } else {
    console.warn("EMAIL NOT SENT OUTSIDE OF PRODUCTION:", emailInput);
  }
}
