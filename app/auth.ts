import { getServerSession } from "next-auth";

import { CURRENT_PROJECT_ID } from "#/lib/constants";
import { db } from "#/lib/db";

export type CurrentHubCoordinator = Awaited<
  ReturnType<typeof currentHubCoordinator>
>;

export async function currentHubCoordinator() {
  const user = await getCurrentUser();
  if (!user) {
    return null;
  }
  const { membership } = user;

  const { identifier } = membership;
  if (!identifier) {
    return null;
  }

  const hubCoordinator = await db.hubCoordinator.findFirst({
    where: { id: identifier },
    include: {
      assignedHub: {
        include: {
          schools: true,
        },
      },
    },
  });

  return hubCoordinator;
}

export type CurrentSupervisor = Awaited<ReturnType<typeof currentSupervisor>>;

export async function currentSupervisor() {
  const user = await getCurrentUser();
  if (!user) {
    return null;
  }
  const { membership } = user;

  const { identifier } = membership;
  if (!identifier) {
    return null;
  }

  const supervisor = await db.supervisor.findFirst({
    where: { id: identifier },
    include: {
      hub: {
        include: {
          schools: {
            include: {
              interventionSessions: true,
            },
          },
        },
      },
      assignedSchools: {
        where: {
          hub: { projectId: CURRENT_PROJECT_ID },
        },
        include: {
          interventionSessions: true,
          _count: {
            select: {
              students: true,
            },
          },
        },
      },
      fellows: {
        include: {
          hub: true,
          fellowAttendances: {
            include: {
              repaymentRequests: true,
            },
          },
          fellowComplaints: true,
          fellowReportingNotes: {
            include: {
              supervisor: true,
            },
          },
          repaymentRequests: {
            include: {
              fellowAttendance: {
                include: {
                  group: true,
                  school: true,
                },
              },
            },
          },
          overallFellowEvaluation: true,
          weeklyFellowRatings: true,
        },
      },
    },
  });

  if (!supervisor) {
    return null;
  }

  const fellowAvgRatings = await db.weeklyFellowRatings.groupBy({
    by: ["fellowId"],
    _avg: {
      behaviourRating: true,
      programDeliveryRating: true,
      dressingAndGroomingRating: true,
      punctualityRating: true,
    },
    where: {
      fellowId: {
        in: supervisor.fellows.map((fellow) => fellow.id),
      },
    },
  });

  const newFellowsData = supervisor.fellows.map((fellow) => {
    const ratings = fellowAvgRatings.find((i) => i.fellowId === fellow.id);
    return {
      ...fellow,
      behaviourRating: ratings?._avg.behaviourRating,
      programDeliveryRating: ratings?._avg.programDeliveryRating,
      dressingAndGroomingRating: ratings?._avg.dressingAndGroomingRating,
      punctualityRating: ratings?._avg.punctualityRating,
    };
  });

  return { ...supervisor, fellows: newFellowsData };
}

export type CurrentUser = Awaited<ReturnType<typeof getCurrentUser>>;

export async function getCurrentUser() {
  const session = await getServerSession();
  if (!session) {
    return null;
  }

  const user = await db.user.findUniqueOrThrow({
    where: { email: session.user.email ?? undefined },
    include: { memberships: true },
  });

  // TODO: add membership to next-auth session to know which implementer, a user is logged in for
  const membership = user.memberships[0];
  if (!membership) {
    throw new Error("No membership");
  }

  let personnelRole: "supervisor" | "hc" | null = null;
  if (membership.identifier) {
    if (membership.identifier.startsWith("sup")) {
      personnelRole = "supervisor";
    } else if (membership.identifier.startsWith("hc")) {
      personnelRole = "hc";
    }
  }

  return { session, user, membership, personnelRole };
}

export async function getCurrentPersonnel(): Promise<
  CurrentSupervisor | CurrentHubCoordinator | null
> {
  const user = await getCurrentUser();
  if (!user) {
    return null;
  }
  const { personnelRole } = user;

  if (!personnelRole) {
    return null;
  }

  if (personnelRole === "supervisor") {
    return await currentSupervisor();
  }

  if (personnelRole === "hc") {
    return await currentHubCoordinator();
  }

  return null;
}
