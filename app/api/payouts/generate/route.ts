import { SendRawEmailCommandInput } from "@aws-sdk/client-ses";
import {
  addDays,
  format,
  setHours,
  setMinutes,
  startOfWeek,
  subDays,
} from "date-fns";
import * as fastcsv from "fast-csv";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { db } from "#/lib/db";
import { sendEmailWithAttachment } from "#/lib/ses";

export const revalidate = 0;

export async function GET(request: NextRequest) {
  const dayParam = z
    .object({ day: z.enum(["M", "R"]) })
    .safeParse({ day: request.nextUrl.searchParams.get("day") });
  if (!dayParam.success) {
    return NextResponse.json({ error: "Invalid day" }, { status: 400 });
  }

  try {
    const { day } = dayParam.data;
    const isFebruary1st =
      new Date().getMonth() === 1 && new Date().getDate() === 1;
    const specialStartTimeForFeb1st = new Date(2024, 0, 23);
    const cuttoffStartTime = isFebruary1st
      ? specialStartTimeForFeb1st
      : getStartCuttoffRange(day);
    const cuttoffEndTime = getEndCuttoffRange(day);

    const attendances = await db.fellowAttendance.findMany({
      where: {
        session: {
          sessionDate: {
            gte: cuttoffStartTime,
            lt: cuttoffEndTime,
          },
          occurred: true,
        },
        attended: true,
      },
      include: {
        fellow: true,
        session: true,
      },
    });

    const payouts: {
      [fellowVisibleId: string]: {
        fellowVisibleId: string;
        mpesaName: string | null;
        mpesaNumber: string | null;
        kesPayoutAmount: number;
        presessionCount: number;
        sessionCount: number;
      };
    } = {};

    const filterSet = new Set();

    for (const attendance of attendances) {
      if (!payouts[attendance.fellow.visibleId]) {
        payouts[attendance.fellow.visibleId] = {
          fellowVisibleId: attendance.fellow.visibleId,
          mpesaName: attendance.fellow.mpesaName,
          mpesaNumber: attendance.fellow.mpesaNumber,
          kesPayoutAmount: 0,
          presessionCount: 0,
          sessionCount: 0,
        };
      }
      const sessionType = attendance.session?.sessionType;
      const payout = payouts[attendance.fellow.visibleId];
      const filterKey = `${attendance.fellow.visibleId}-${attendance.schoolId}-${attendance.session?.sessionType}`;

      if (sessionType && payout) {
        if (sessionType === "s0") {
          if (!filterSet.has(filterKey)) {
            payout.kesPayoutAmount += 500;
            payout.presessionCount += 1;
            filterSet.add(filterKey);
          }
        } else if (["s1", "s2", "s3", "s4"].includes(sessionType)) {
          if (!filterSet.has(filterKey)) {
            payout.kesPayoutAmount += 1500;
            payout.sessionCount += 1;
            filterSet.add(filterKey);
          }
        } else {
          throw new Error("Invalid session type");
        }
      }
    }
    const payoutRows = Object.values(payouts);

    const payoutsWithoutMpesaNumber = payoutRows.filter(
      (payout) => !payout.mpesaNumber,
    ).length;
    const payoutsWithoutMpesaName = payoutRows.filter(
      (payout) => !payout.mpesaName,
    ).length;
    const totalPayoutAmount = payoutRows.reduce(
      (acc, payout) => acc + payout.kesPayoutAmount,
      0,
    );
    const totalPayoutAmountWithMpesaInfoPresent = payoutRows
      .filter((payout) => payout.mpesaNumber && payout.mpesaName)
      .reduce((acc, payout) => acc + payout.kesPayoutAmount, 0);

    const csvStream = fastcsv.format({ headers: true });
    payoutRows.forEach((row) => csvStream.write(row));
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
              cuttoffStartTime,
              "yyyy-MM-dd",
            )} to ${format(cuttoffEndTime, "yyyy-MM-dd")}\n` +
            `MIME-Version: 1.0\n` +
            `Content-Type: multipart/mixed; boundary="NextPart"\n\n` +
            `--NextPart\n` +
            `Content-Type: text/plain\n\n` +
            `Please find the attached payouts CSV.\n\n` +
            `There were ${payoutsWithoutMpesaName} payouts without Mpesa names and ${payoutsWithoutMpesaNumber} payouts without Mpesa numbers.\n\n` +
            `The total payout amount is KES ${totalPayoutAmount} and the total payout amount with Mpesa info present is KES ${totalPayoutAmountWithMpesaInfoPresent}.\n\n` +
            `--NextPart\n` +
            `Content-Type: text/csv; name="payouts.csv"\n` +
            `Content-Disposition: attachment; filename="payouts.csv"\n\n` +
            csvBuffer.toString() +
            `\n--NextPart--`,
        ),
      },
    };
    await sendEmailWithAttachment(emailInput);

    return NextResponse.json({
      message: `Tabulated ${payoutRows.length} payouts`,
      currentTime: new Date(),
      cuttoffStartTime,
      cuttoffEndTime,
      payoutsWithoutMpesaName,
      payoutsWithoutMpesaNumber,
      totalPayoutAmount,
      totalPayoutAmountWithMpesaInfoPresent,
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

const cutoffHour = 6; // 6am UTC / 9am EAT
const cutoffMinute = 0;

function getStartCuttoffRange(day: "R" | "M"): Date {
  switch (day) {
    case "R":
      let thisMonday = startOfWeek(new Date(), { weekStartsOn: 1 });

      thisMonday = setHours(thisMonday, cutoffHour);
      thisMonday = setMinutes(thisMonday, cutoffMinute);
      return thisMonday;
    case "M":
      let lastMonday = startOfWeek(subDays(new Date(), 7), {
        weekStartsOn: 1,
      });

      let lastThursday = setHours(lastMonday, cutoffHour);
      lastThursday = setMinutes(lastThursday, cutoffMinute);
      lastThursday = addDays(lastThursday, 3); // Move to Thursday
      return lastThursday;
    default:
      throw new Error("Invalid day");
  }
}

function getEndCuttoffRange(day: "R" | "M"): Date {
  switch (day) {
    case "R":
      // Thursday 9am EAT
      let thisThursday = startOfWeek(new Date(), { weekStartsOn: 1 });
      thisThursday = setHours(thisThursday, cutoffHour);
      thisThursday = setMinutes(thisThursday, cutoffMinute);
      thisThursday = addDays(thisThursday, 3); // Move to Thursday

      return thisThursday;
    case "M":
      // Monday 9am UTC
      let thisMonday = startOfWeek(new Date(), { weekStartsOn: 1 });
      thisMonday = setHours(thisMonday, cutoffHour);
      thisMonday = setMinutes(thisMonday, cutoffMinute);
      return thisMonday;
    default:
      throw new Error("Invalid day");
  }
}
