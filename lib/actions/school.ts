"use server";

import { getCurrentPersonnel, getCurrentUser } from "#/app/auth";
import { db } from "#/lib/db";
import { ImplementerRole } from "@prisma/client";

export async function fetchSchool(visibleId: string) {
  const user = await getCurrentUser();
  if (user === null) {
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

export async function fetchHubSchools() {
  const user = await getCurrentPersonnel();
  if (user === null) {
    throw new Error("Unauthorized");
  }

  const role = user.user.membership.role;
  const allowedRoles: ImplementerRole[] = [
    ImplementerRole.HUB_COORDINATOR,
    ImplementerRole.SUPERVISOR,
    ImplementerRole.FELLOW,
  ];

  if (!allowedRoles.includes(role)) {
    throw new Error("Unauthorized");
  }

  const hubId =
    role === ImplementerRole.HUB_COORDINATOR
      ? "assignedHubId" in user
        ? user.assignedHubId
        : null
      : "hubId" in user
        ? user.hubId
        : null;

  if (!hubId) {
    throw new Error("Personnel has no assigned hub");
  }

  try {
    const schools = await db.school.findMany({
      where: {
        hub: { id: hubId },
      },
      select: {
        visibleId: true,
        schoolName: true,
        hub: {
          select: {
            hubName: true,
          },
        },
      },
    });

    return { success: true, data: schools };
  } catch (error) {
    console.error("Error fetching hub schools:", error);
    return { success: false, message: "Error fetching hub schools" };
  }
}
