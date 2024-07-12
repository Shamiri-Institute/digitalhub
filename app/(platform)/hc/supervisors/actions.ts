"use server";

import { WeeklyHubTeamMeetingSchema } from "#/app/(platform)/hc/schemas";
import { db } from "#/lib/db";

import { z } from "zod";

export async function submitWeeklyTeamMeeting(
  data: z.infer<typeof WeeklyHubTeamMeetingSchema>,
) {
  try {
    const parsedData = WeeklyHubTeamMeetingSchema.parse(data);

    await db.weeklyTeamMeetingReport.create({
      data: parsedData,
    });
    //TODO: If there will be a view for the weekly report, we should add a revalidation here
    return {
      success: true,
      message: "Successfully submitted the weekly team meeting report",
    };
  } catch (e) {
    console.error(e);
    return {
      success: false,
      message: "Something went wrong. Please try again",
    };
  }
}
