"use server";

import { db } from "#/lib/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ReportingNotesSchema } from "./schema";

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
    return { success: false, errors: e };
  }
}
