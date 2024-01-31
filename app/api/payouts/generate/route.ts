import { addDays, setHours, setMinutes, startOfWeek, subDays } from "date-fns";
import * as fastcsv from "fast-csv";
import * as fs from "fs";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { db } from "#/lib/db";

export const revalidate = 60 * 60 * 24; // 24 hours

export async function GET(request: NextRequest) {
  const dayParam = z
    .object({ day: z.enum(["M", "R"]) })
    .safeParse({ day: request.nextUrl.searchParams.get("day") });
  if (!dayParam.success) {
    return NextResponse.json({ error: "Invalid day" }, { status: 400 });
  }

  try {
    const { day } = dayParam.data;
    const cuttoffStartTime = getStartCuttoffRange(day);
    const cuttoffEndTime = getEndCuttoffRange(day);

    const attendances = await db.fellowAttendance.findMany({
      where: {
        session: {
          sessionDate: {
            gte: cuttoffStartTime,
            lt: cuttoffEndTime,
          },
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
      if (sessionType && payout) {
        if (sessionType === "s0") {
          payout.kesPayoutAmount += 500;
          payout.presessionCount += 1;
        } else if (["s1", "s2", "s3", "s4"].includes(sessionType)) {
          payout.kesPayoutAmount += 1500;
          payout.sessionCount += 1;
        } else {
          throw new Error("Invalid session type");
        }
      }
    }
    const payoutRows = Object.values(payouts);

    const ws = fs.createWriteStream("payouts.csv");
    fastcsv.write(payoutRows, { headers: true }).pipe(ws);

    return NextResponse.json({
      message: `Tabulated ${payoutRows.length} payouts`,
      currentTime: new Date(),
      cuttoffStartTime,
      cuttoffEndTime,
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

function getStartCuttoffRange(day: "R" | "M"): Date {
  switch (day) {
    case "R":
      // Get the start of the current week (Monday 00:00)
      let thisMonday = startOfWeek(new Date(), { weekStartsOn: 1 });

      // Set the time to 9am EAT (UTC+3)
      thisMonday = setHours(thisMonday, 9);
      thisMonday = setMinutes(thisMonday, 0);
      return thisMonday;
    case "M":
      // Get the start of the previous week (Monday 00:00)
      let lastMonday = startOfWeek(subDays(new Date(), 7), { weekStartsOn: 1 });

      // Set the time to 9am EAT (UTC+3) on Thursday
      let lastThursday = setHours(lastMonday, 9);
      lastThursday = setMinutes(lastThursday, 0);
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
      thisThursday = setHours(thisThursday, 9);
      thisThursday = setMinutes(thisThursday, 0);
      thisThursday = addDays(thisThursday, 3); // Move to Thursday
      return thisThursday;
    case "M":
      // Monday 9am EAT
      let thisMonday = startOfWeek(new Date(), { weekStartsOn: 1 });
      thisMonday = setHours(thisMonday, 9);
      thisMonday = setMinutes(thisMonday, 0);
      return thisMonday;
    default:
      throw new Error("Invalid day");
  }
}
