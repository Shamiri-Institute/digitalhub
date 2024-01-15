"use server";

import { db } from "#/lib/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { OverallFellowSchema, ReportingNotesSchema } from "./schema";

export async function submitReportingNotes(
  data: z.infer<typeof ReportingNotesSchema>,
) {
  try {
    const parsedData = ReportingNotesSchema.parse(data);

    await db.fellowReportingNotes.create({
      data: parsedData,
    });

    revalidatePath("/profile");
    return { success: true, message: "successfully added reporting notes " };
  } catch (e) {
    console.error(e);
    return { success: false, message: "something went wrong" };
  }
}

export async function submitOverallFellowReport(
  data: z.infer<typeof OverallFellowSchema>,
) {
  try {
    const parsedData = OverallFellowSchema.parse(data);
    await db.overallFellowEvaluation.create({
      data: parsedData,
    });

    revalidatePath("/profile");
    return { success: true, message: "successfully added reporting notes" };
  } catch (e) {
    console.error(e);
    return { success: false, message: "something went wrong" };
  }
}
