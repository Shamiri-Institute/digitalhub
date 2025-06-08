import { getServerSession } from "next-auth";

import { CURRENT_PROJECT_ID } from "#/lib/constants";
import { db } from "#/lib/db";

export type CurrentHubCoordinator = Awaited<ReturnType<typeof currentHubCoordinator>>;

export async function currentHubCoordinator() {
  const user = await getCurrentUser();
  if (!user) {
    return null;
  }
  const {
    membership: { identifier },
  } = user;

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

  return { ...hubCoordinator, user };
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

  return { ...supervisor, user, fellows: newFellowsData };
}

export type CurrentFellow = Awaited<ReturnType<typeof currentFellow>>;

export async function currentFellow() {
  const user = await getCurrentUser();
  if (!user) {
    return null;
  }
  const { membership } = user;

  const { identifier } = membership;
  if (!identifier) {
    return null;
  }

  const fellow = await db.fellow.findFirst({
    where: { id: identifier },
    include: {
      hub: {
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
              interventionGroups: {
                include: {
                  leader: true,
                  students: {
                    include: {
                      studentAttendances: true,
                    },
                  },
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
          sessions: true,
        },
      },
      fellowAttendances: {
        include: {
          repaymentRequests: true,
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
      groups: {
        include: {
          _count: {
            select: {
              students: true,
            },
          },
          school: {
            include: {
              _count: {
                select: {
                  interventionSessions: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!fellow) {
    return null;
  }

  return { ...fellow, user };
}

export type CurrentUser = Awaited<ReturnType<typeof getCurrentUser>>;

export type CurrentClinicalLead = Awaited<ReturnType<typeof currentClinicalLead>>;

export async function currentClinicalLead() {
  const user = await getCurrentUser();
  if (!user) {
    return null;
  }
  const { membership } = user;

  const { identifier } = membership;
  if (!identifier) {
    return null;
  }

  const clinicalLead = await db.clinicalLead.findFirst({
    where: { id: identifier },
    include: {
      assignedHub: true,
      clinicalScreeningCases: true,
    },
  });

  if (!clinicalLead) {
    return null;
  }

  return { ...clinicalLead, user };
}

export type CurrentClinicalTeam = Awaited<ReturnType<typeof currentClinicalTeam>>;

export async function currentClinicalTeam() {
  const user = await getCurrentUser();
  if (!user) {
    return null;
  }

  const { membership } = user;

  const { identifier } = membership;
  if (!identifier) {
    return null;
  }

  const clinicalTeam = await db.clinicalTeam.findFirst({
    where: { id: identifier },
    include: {
      assignedHub: true,
      implementer: true,
    },
  });

  if (!clinicalTeam) {
    return null;
  }

  return {
    ...clinicalTeam,
    user,
  };
}

export type CurrentOpsUser = Awaited<ReturnType<typeof currentOpsUser>>;

export async function currentOpsUser() {
  const user = await getCurrentUser();
  if (!user) {
    return null;
  }

  const { membership } = user;

  const { identifier } = membership;
  if (!identifier) {
    return null;
  }

  const opsUser = await db.opsUser.findFirst({
    where: { id: identifier },
    include: {
      implementer: true,
      assignedHub: true,
    },
  });

  if (!opsUser) {
    return null;
  }

  return { ...opsUser, user };
}

export type CurrentAdminUser = Awaited<ReturnType<typeof currentAdminUser>>;

export async function currentAdminUser() {
  const user = await getCurrentUser();
  if (!user) {
    return null;
  }

  const { membership } = user;

  const { identifier } = membership;
  if (!identifier) {
    return null;
  }

  const adminUser = await db.adminUser.findFirst({
    where: { id: identifier },
  });

  if (!adminUser) {
    return null;
  }

  return { ...adminUser, user };
}

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
  | CurrentSupervisor
  | CurrentHubCoordinator
  | CurrentFellow
  | CurrentClinicalLead
  | CurrentOpsUser
  | CurrentUser
  | CurrentClinicalTeam
  | CurrentAdminUser
  | null
> {
  const user = await getCurrentUser();
  if (!user) {
    return null;
  }
  const { role } = user.membership;

  if (role === "SUPERVISOR") {
    return await currentSupervisor();
  }

  if (role === "HUB_COORDINATOR") {
    return await currentHubCoordinator();
  }

  if (role === "FELLOW") {
    return await currentFellow();
  }

  if (role === "CLINICAL_LEAD") {
    return await currentClinicalLead();
  }

  if (role === "OPERATIONS") {
    return await currentOpsUser();
  }

  if (role === "CLINICAL_TEAM") {
    return await currentClinicalTeam();
  }

  if (role === "ADMIN") {
    return await currentAdminUser();
  }

  return null;
}
