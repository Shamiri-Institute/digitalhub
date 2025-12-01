"use server";

import { ImplementerRole } from "@prisma/client";
import { getCurrentPersonnel, getCurrentUserSession } from "#/app/auth";
import { db } from "#/lib/db";

export async function fetchSchool(visibleId: string) {
  const session = await getCurrentUserSession();
  if (session === null) {
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

  const role = user.session.user.activeMembership?.role;
  const allowedRoles: ImplementerRole[] = [
    ImplementerRole.HUB_COORDINATOR,
    ImplementerRole.SUPERVISOR,
    ImplementerRole.FELLOW,
  ];

  if (!role || !allowedRoles.includes(role)) {
    throw new Error("Unauthorized");
  }

  let hubId: string | null = null;
  if (role === ImplementerRole.HUB_COORDINATOR) {
    const profile = user.profile as { assignedHubId?: string | null } | null;
    hubId = profile?.assignedHubId ?? null;
  } else {
    const profile = user.profile as { hubId?: string | null } | null;
    hubId = profile?.hubId ?? null;
  }

  if (!hubId) {
    throw new Error("Personnel has no assigned hub");
  }

  try {
    const schools = await db.school.findMany({
      where: {
        hubId: hubId,
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
