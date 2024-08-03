"use server";

import { DropoutSupervisorSchema } from "#/app/(platform)/hc/schemas";
import { currentHubCoordinator, getCurrentUser } from "#/app/auth";
import { db } from "#/lib/db";

export async function dropoutSupervisor(
  supervisorId: string,
  dropoutReason: string,
) {
  try {
    const hubCoordinator = await currentHubCoordinator();
    const user = await getCurrentUser();

    if (!hubCoordinator || !user) {
      throw new Error("The session has not been authenticated");
    }

    const data = DropoutSupervisorSchema.parse({ supervisorId, dropoutReason });
    const result = await db.supervisor.update({
      data: {
        // TODO: add columns for drop-out details. Confirm with @Wendy
        // dropoutReason: data.dropoutReason,
        // droppedOutAt: new Date(),
        droppedOut: true,
      },
      where: {
        id: data.supervisorId,
      },
      include: {
        assignedSchools: true,
        fellows: true,
      },
    });

    return {
      success: true,
      message: result.supervisorName + " successfully dropped out.",
      data: result,
    };
  } catch (e) {
    console.error(e);
    return {
      success: false,
      message: "Something went wrong while trying to drop out the school",
    };
  }
}
