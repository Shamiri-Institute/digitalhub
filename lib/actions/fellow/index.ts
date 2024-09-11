"use server";

import { EditFellowSchema } from "#/app/(platform)/hc/schemas";
import { currentHubCoordinator, getCurrentUser } from "#/app/auth";
import { db } from "#/lib/db";
import { z } from "zod";

async function checkAuth() {
  const hubCoordinator = await currentHubCoordinator();
  const user = await getCurrentUser();

  if (!hubCoordinator || !user) {
    throw new Error("The session has not been authenticated");
  }
}

export async function updateFellowDetails(
  data: z.infer<typeof EditFellowSchema>,
) {
  try {
    await checkAuth();

    const {
      id,
      fellowName,
      fellowEmail,
      county,
      subCounty,
      cellNumber,
      mpesaName,
      mpesaNumber,
      gender,
      idNumber,
      dateOfBirth,
    } = EditFellowSchema.parse(data);

    await db.fellow.update({
      where: {
        id,
      },
      data: {
        fellowName,
        fellowEmail,
        county,
        subCounty,
        cellNumber,
        mpesaName,
        mpesaNumber,
        gender,
        idNumber,
        dateOfBirth,
      },
    });
    return {
      success: true,
      message: `Successfully updated details for ${fellowName}`,
    };
  } catch (err) {
    console.error(err);
    return {
      success: false,
      message:
        (err as Error)?.message ?? "Sorry, could not update fellow details.",
    };
  }
}
