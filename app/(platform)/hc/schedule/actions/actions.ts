"use server";

import { ScheduleNewSessionSchema } from "#/app/(platform)/hc/schemas";
import { objectId } from "#/lib/crypto";
import { db } from "#/lib/db";
import { addHours, addMinutes } from "date-fns";
import { z } from "zod";

export async function createNewSession(
  data: z.infer<typeof ScheduleNewSessionSchema>,
) {
  try {
    const parsedData = ScheduleNewSessionSchema.parse(data);

    const sessionTypes = {
      s0: "Presession",
      s1: "Session 01",
      s2: "Session 02",
      s3: "Session 03",
      s4: "Session 04",
    };

    const hours = +(parsedData.sessionDuration.split(":")[0] ?? 0);
    const minutes = +(parsedData.sessionDuration.split(":")[1] ?? 0);
    const sessionEndTime = addHours(
      addMinutes(parsedData.sessionDate, minutes),
      hours,
    );
    await db.interventionSession.create({
      data: {
        id: objectId("isess"),
        sessionName:
          sessionTypes[parsedData.sessionType as keyof typeof sessionTypes],
        sessionDate: parsedData.sessionDate,
        sessionType: parsedData.sessionType,
        sessionEndTime,
        yearOfImplementation:
          parsedData.sessionDate.getFullYear() || new Date().getFullYear(),
        schoolId: parsedData.schoolId,
        occurred: false,
        projectId: parsedData.projectId,
      },
    });

    // revalidatePath("/hc/schedule");
    return {
      success: true,
      message: "Successfully scheduled new session ",
    };
  } catch (e: any) {
    console.error(e);
    return { success: false, message: "something went wrong" };
  }
}
