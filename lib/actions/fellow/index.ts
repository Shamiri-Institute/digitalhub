"use server";

import { FellowDetailsSchema } from "#/app/(platform)/hc/schemas";
import { currentHubCoordinator, currentSupervisor } from "#/app/auth";
import { objectId } from "#/lib/crypto";
import { db } from "#/lib/db";
import { generateFellowVisibleID } from "#/lib/utils";
import { z } from "zod";

async function checkAuth() {
  const hubCoordinator = await currentHubCoordinator();
  const supervisor = await currentSupervisor();

  if (!hubCoordinator && !supervisor) {
    throw new Error("The session has not been authenticated");
  }

  return { hubCoordinator, supervisor };
}

export async function submitFellowDetails(
  data: z.infer<typeof FellowDetailsSchema>,
) {
  try {
    const { hubCoordinator, supervisor } = await checkAuth();

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
      mode,
    } = FellowDetailsSchema.parse(data);

    if (mode === "edit") {
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
    } else if (mode === "add" && (hubCoordinator || supervisor)) {
      // TODO: Let's track this as a serial number on implementer
      const fellowsCreatedThisYearCount = await db.fellow.count({
        where: {
          createdAt: {
            gte: new Date(new Date().getFullYear(), 0, 1),
          },
        },
      });

      await db.fellow.create({
        data: {
          id: objectId("fellow"),
          visibleId: generateFellowVisibleID(fellowsCreatedThisYearCount),
          hubId: supervisor?.hubId ?? hubCoordinator?.assignedHubId,
          supervisorId: supervisor?.id,
          implementerId:
            supervisor?.implementerId ?? hubCoordinator?.implementerId,
          fellowName,
          fellowEmail,
          cellNumber,
          mpesaName,
          mpesaNumber,
          idNumber,
          county,
          subCounty,
          dateOfBirth,
          gender,
        },
      });
      return {
        success: true,
        message: `Successfully added ${fellowName}`,
      };
    } else {
      return {
        success: false,
        message:
          hubCoordinator === null && supervisor === null
            ? `User is not authorised to perform this action`
            : "Something went wrong",
      };
    }
  } catch (err) {
    console.error(err);
    const { mode } = FellowDetailsSchema.parse(data);
    return {
      success: false,
      message:
        (err as Error)?.message ?? mode === "edit"
          ? "Sorry, could not update fellow details."
          : "Sorry, could not add new fellow",
    };
  }
}
