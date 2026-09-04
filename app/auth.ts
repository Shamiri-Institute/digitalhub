import { ImplementerRole } from "@prisma/client";
import { redirect } from "next/navigation";
import { cache } from "react";
import { getActiveProjectId } from "#/lib/active-project-id";
import { getCachedSession } from "#/lib/auth-options";
import { db } from "#/lib/db";

export type CurrentHubCoordinator = Awaited<ReturnType<typeof currentHubCoordinator>>;

export const currentHubCoordinator = cache(async () => {
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

  if (!hubCoordinator) {
    return null;
  }

  return { profile: hubCoordinator, session };
});

export type CurrentSupervisor = Awaited<ReturnType<typeof currentSupervisor>>;

export const currentSupervisor = cache(async () => {
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

  const projectId = await getActiveProjectId();

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
          hub: { projectId },
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
});

export type CurrentSupervisorLite = Awaited<ReturnType<typeof currentSupervisorLite>>;

export const currentSupervisorLite = cache(async () => {
  const session = await getCurrentUserSession();
  if (!session) {
    return null;
  }
  const membership = session.user.activeMembership;
  if (!membership?.identifier) {
    return null;
  }

  const supervisor = await db.supervisor.findFirst({
    where: { id: membership.identifier },
    select: {
      id: true,
      hubId: true,
      hub: { select: { projectId: true } },
    },
  });

  if (!supervisor) {
    return null;
  }

  return { profile: supervisor, session };
});

export type CurrentFellow = Awaited<ReturnType<typeof currentFellow>>;

export const currentFellow = cache(async () => {
  const session = await getCurrentUserSession();
  if (!session) {
    return null;
  }
  const membership = session.user.activeMembership;
  if (!membership?.identifier) {
    return null;
  }

  const fellow = await db.fellow.findFirst({
    where: { id: membership.identifier },
    include: { hub: true },
  });

  if (!fellow) {
    return null;
  }

  return { profile: fellow, session };
});

export type CurrentClinicalLead = Awaited<ReturnType<typeof currentClinicalLead>>;

export const currentClinicalLead = cache(async () => {
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
});

export type CurrentClinicalTeam = Awaited<ReturnType<typeof currentClinicalTeam>>;

export const currentClinicalTeam = cache(async () => {
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
});

export type CurrentOpsUser = Awaited<ReturnType<typeof currentOpsUser>>;

export const currentOpsUser = cache(async () => {
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
});

export type CurrentAdminUser = Awaited<ReturnType<typeof currentAdminUser>>;

export const currentAdminUser = cache(async () => {
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
});

export async function getCurrentUserSession() {
  const session = await getCachedSession();
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

export async function requireLayoutRole(role: ImplementerRole): Promise<void> {
  const session = await getCachedSession();
  if (session?.user.activeMembership?.role !== role) {
    redirect("/");
  }
}
