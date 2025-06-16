"use server";

import { currentAdminUser } from "#/app/auth";
import { db } from "#/lib/db";

export async function fetchSchool(visibleId: string) {
  const admin = await currentAdminUser();
  if (admin === null) {
    throw new Error("Unauthorized");
  }

  try {
    const school = await db.school.findUnique({
      where: {
        visibleId: visibleId,
      },
      include: {
        interventionSessions: {
          include: {
            session: true,
          },
        },
        hub: {
          include: {
            sessions: true,
          },
        },
        _count: {
          select: {
            interventionSessions: true,
            students: true,
            interventionGroups: true,
          },
        },
        schoolDropoutHistory: {
          include: {
            user: true,
          },
        },
      },
    });

    return { success: true, data: school };
  } catch (error) {
    console.error("Error fetching implementer school:", error);
    return { success: false, message: "Error fetching implementer school" };
  }
}

export type SchoolData = Awaited<ReturnType<typeof fetchSchool>>["data"];
