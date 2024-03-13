"use server";

import { RatingState } from "#/app/(platform)/profile/components/weekly-fellow-evaluation-form";
import { db } from "#/lib/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  FellowComplaintSchema,
  OverallFellowSchema,
  ReportingNotesSchema,
  WeeklyFellowRatingSchema,
} from "./schema";

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

export async function submitFellowComplaint(
  data: z.infer<typeof FellowComplaintSchema>,
) {
  try {
    const parsedData = FellowComplaintSchema.parse(data);
    await db.fellowComplaints.create({
      data: parsedData,
    });

    revalidatePath("/profile");
    return { success: true, message: "successfully added fellow complaint" };
  } catch (e) {
    console.error(e);
    return { success: false, message: "something went wrong" };
  }
}

export async function submitWeeklyFellowRating(
  data: z.infer<typeof WeeklyFellowRatingSchema>,
  rating: RatingState,
) {
  try {
    const { ratings } = rating;

    const parsedData = WeeklyFellowRatingSchema.parse(data);

    console.log({ ratings })
    console.log({ parsedData })
    console.log({
      finalData: {
        ...parsedData,
        ...ratings
      }
    })

    await db.weeklyFellowRatings.create({
      data: {
        ...parsedData,
        ...ratings,
      },
    });

    revalidatePath("/profile");
    return {
      success: true,
      message: "successfully recorded fellow's weekly rating",
    };
  } catch (e) {
    console.error(e);
    return { success: false, message: "something went wrong" };
  }
}
