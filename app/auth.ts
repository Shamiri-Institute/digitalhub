import { getServerSession } from "next-auth";

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
      assignedHub: true,
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
      assignedSchool: {
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
          fellowAttendances: true,
          fellowComplaints: true,
          fellowReportingNotes: {
            include: {
              supervisor: true,
            },
          },
          repaymentRequests: {
            include: {
              groupSession: {
                include: {
                  session: {
                    include: {
                      school: true,
                    },
                  },
                },
              },
            },
          },
          groupSessions: {
            include: {
              session: {
                include: {
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

  const { assignedSchoolId, assignedSchool } = supervisor;
  if (!assignedSchoolId || !assignedSchool) {
    throw new Error("Supervisor has no assigned school");
  }

  return { ...supervisor, assignedSchoolId, assignedSchool };
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

export async function getCurrentPersonnel(): Promise<CurrentSupervisor | null> {
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

  return null;
}
