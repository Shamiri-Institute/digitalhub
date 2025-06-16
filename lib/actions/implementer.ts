"use server";

import { currentAdminUser } from "#/app/auth";
import { JWTMembership } from "#/lib/actions/fetch-personnel";
import { db } from "#/lib/db";

export async function fetchImplementerStats(implementerId: string) {
  const admin = await currentAdminUser();
  if (admin === null) {
    throw new Error("Unauthorized");
  }

  try {
    const stats = await db.$queryRaw<
      {
        hub_count: number;
        school_count: number;
        student_count: number;
      }[]
    >`SELECT
      COUNT(DISTINCT h.id) AS hub_count,
      COUNT(DISTINCT sch.id) AS school_count,
      COUNT(DISTINCT stu.id) AS student_count
    FROM
      hubs h
      LEFT JOIN schools sch ON h.id = sch.hub_id
      LEFT JOIN students stu ON sch.id = stu.school_id
    WHERE
      h.implementer_id = ${implementerId}`;

    return { success: true, data: stats[0] };
  } catch (error) {
    console.error("Error fetching implementer stats:", error);
    return { success: false, message: "Error fetching implementer stats" };
  }
}

export async function fetchImplementerSessionTypes(implementerId: string) {
  const admin = await currentAdminUser();
  if (admin === null) {
    throw new Error("Unauthorized");
  }

  try {
    const sessionTypes = await db.sessionName.findMany({
      where: {
        hub: {
          implementerId: implementerId,
        },
      },
      distinct: ["sessionName"],
    });

    return { success: true, data: sessionTypes };
  } catch (error) {
    console.error("Error fetching implementer session types:", error);
    return {
      success: false,
      message: "Error fetching implementer session types",
    };
  }
}

export async function fetchImplementerHubs(activeMembership: JWTMembership) {
  const admin = await currentAdminUser();
  if (admin === null) {
    throw new Error("Unauthorized");
  }

  try {
    const hubs = await db.hub.findMany({
      where: {
        implementerId: activeMembership.implementerId,
      },
      include: {
        schools: {
          include: {
            assignedSupervisor: true,
            interventionSessions: {
              include: {
                sessionRatings: true,
                session: true,
              },
            },
            students: {
              include: {
                assignedGroup: true,
                _count: {
                  select: {
                    clinicalCases: true,
                  },
                },
              },
            },
          },
        },
        implementer: true,
        coordinators: true,
        _count: {
          select: {
            fellows: {
              where: {
                droppedOut: false || null,
              },
            },
            supervisors: {
              where: {
                droppedOut: false || null,
              },
            },
          },
        },
      },
    });

    return { success: true, data: hubs };
  } catch (error) {
    console.error("Error fetching implementer hubs:", error);
    return { success: false, message: "Error fetching implementer hubs" };
  }
}

export async function fetchImplementerSchools(implementerId: string) {
  const admin = await currentAdminUser();
  if (admin === null) {
    throw new Error("Unauthorized");
  }

  try {
    const schools = await db.school.findMany({
      where: {
        hub: {
          implementerId: implementerId,
        },
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
    console.error("Error fetching implementer schools:", error);
    return { success: false, message: "Error fetching implementer schools" };
  }
}
