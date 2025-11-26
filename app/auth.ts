import { ImplementerRole } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "#/lib/auth-options";
import { CURRENT_PROJECT_ID } from "#/lib/constants";
import { db } from "#/lib/db";

export type CurrentHubCoordinator = Awaited<ReturnType<typeof currentHubCoordinator>>;

export async function currentHubCoordinator() {
  const session = await getCurrentUserSession();
  if (!session) {
    return null;
  }
  const membership = session.user.activeMembership;
  if (!membership) {
    return null;
  }

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

  return { profile: hubCoordinator, session };
}

export type CurrentSupervisor = Awaited<ReturnType<typeof currentSupervisor>>;

export async function currentSupervisor() {
  const session = await getCurrentUserSession();
  if (!session) {
    return null;
  }
  const membership = session.user.activeMembership;
  if (!membership) {
    return null;
  }

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

  return { profile: supervisor, session, fellows: newFellowsData };
}

export type CurrentFellow = Awaited<ReturnType<typeof currentFellow>>;

export async function currentFellow() {
  const session = await getCurrentUserSession();
  if (!session) {
    return null;
  }
  const membership = session.user.activeMembership;
  if (!membership) {
    return null;
  }

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

  return { profile: fellow, session };
}

export type CurrentClinicalLead = Awaited<ReturnType<typeof currentClinicalLead>>;

export async function currentClinicalLead() {
  const session = await getCurrentUserSession();
  if (!session) {
    return null;
  }
  const membership = session.user.activeMembership;
  if (!membership) {
    return null;
  }

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

  return { profile: clinicalLead, session };
}

export type CurrentClinicalTeam = Awaited<ReturnType<typeof currentClinicalTeam>>;

export async function currentClinicalTeam() {
  const session = await getCurrentUserSession();
  if (!session) {
    return null;
  }

  const membership = session.user.activeMembership;
  if (!membership) {
    return null;
  }

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
    profile: clinicalTeam,
    session,
  };
}

export type CurrentOpsUser = Awaited<ReturnType<typeof currentOpsUser>>;

export async function currentOpsUser() {
  const session = await getCurrentUserSession();
  if (!session) {
    return null;
  }

  const membership = session.user.activeMembership;
  if (!membership) {
    return null;
  }

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

  return { profile: opsUser, session };
}

export type CurrentAdminUser = Awaited<ReturnType<typeof currentAdminUser>>;

export async function currentAdminUser() {
  const session = await getCurrentUserSession();
  if (!session) {
    return null;
  }

  const membership = session.user.activeMembership;
  if (!membership) {
    return null;
  }

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

  return { profile: adminUser, session };
}

export async function getCurrentUserSession() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return null;
  }

  const { memberships } = session.user;
  if (!memberships || memberships.length === 0) {
    throw new Error("No memberships");
  }

  return session;
}

export type CurrentPersonnel = Awaited<ReturnType<typeof getCurrentPersonnel>>;

export async function getCurrentPersonnel(): Promise<
  | CurrentSupervisor
  | CurrentHubCoordinator
  | CurrentFellow
  | CurrentClinicalLead
  | CurrentOpsUser
  | CurrentClinicalTeam
  | CurrentAdminUser
  | null
> {
  const session = await getCurrentUserSession();
  if (!session) {
    return null;
  }
  const role = session.user.activeMembership?.role;
  if (!role) {
    return null;
  }

  if (role === ImplementerRole.SUPERVISOR) {
    return await currentSupervisor();
  }

  if (role === ImplementerRole.HUB_COORDINATOR) {
    return await currentHubCoordinator();
  }

  if (role === ImplementerRole.FELLOW) {
    return await currentFellow();
  }

  if (role === ImplementerRole.CLINICAL_LEAD) {
    return await currentClinicalLead();
  }

  if (role === ImplementerRole.OPERATIONS) {
    return await currentOpsUser();
  }

  if (role === ImplementerRole.CLINICAL_TEAM) {
    return await currentClinicalTeam();
  }

  if (role === ImplementerRole.ADMIN) {
    return await currentAdminUser();
  }

  return null;
}
