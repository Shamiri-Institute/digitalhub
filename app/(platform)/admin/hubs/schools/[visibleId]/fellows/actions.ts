"use server";

import { currentHubCoordinator } from "#/app/auth";
import { db } from "#/lib/db";

async function checkAuth() {
  const hc = await currentHubCoordinator();

  if (!hc) {
    throw new Error("User not authorised to perform this function");
  }
}

export async function assignFellowSupervisor({
  fellowId,
  supervisorId,
}: {
  fellowId: string;
  supervisorId: string;
}) {
  try {
    await checkAuth();
    const result = await db.fellow.update({
      where: {
        id: fellowId,
      },
      data: {
        supervisorId,
      },
      include: {
        supervisor: true,
      },
    });
    return {
      success: true,
      message: `Successfully assigned ${result.fellowName} to ${result.supervisor ? result.supervisor.supervisorName : "supervisor"}.`,
    };
  } catch (error: unknown) {
    console.error(error);
    return { error: "Something went wrong assigning a supervisor" };
  }
}
