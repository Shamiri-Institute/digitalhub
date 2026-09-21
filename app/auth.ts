import { avg, eq, inArray } from "drizzle-orm";
import { redirect } from "next/navigation";
import type { Session } from "next-auth";
import { cache } from "react";

import { db } from "#/db/client";
import { ImplementerRole } from "#/db/enums";
import { hub, session as sessionTable, weeklyFellowRatings } from "#/db/schema";
import { getActiveProjectId } from "#/lib/active-project-id";
import { roleHome } from "#/lib/auth/role-home";
import { getCachedSession } from "#/lib/auth-options";

function requireRole(session: Session, role: ImplementerRole) {
  const membership = session.user.activeMembership;
  if (membership && membership.role !== role) {
    redirect(roleHome[membership.role]);
  }
  return membership;
}

export type CurrentHubCoordinator = Awaited<ReturnType<typeof currentHubCoordinator>>;

export const currentHubCoordinator = cache(async () => {
  const session = await getCurrentUserSession();
  if (!session) {
    return null;
  }
  const membership = requireRole(session, ImplementerRole.HUB_COORDINATOR);
  if (!membership) {
    return null;
  }

  const { identifier } = membership;
  if (!identifier) {
    return null;
  }

  const hubCoordinator = await db.query.hubCoordinator.findFirst({
    where: (hc, { eq }) => eq(hc.id, identifier),
    with: {
      assignedHub: {
        with: {
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

const nullableNumber = (value: string | null) => (value === null ? null : Number(value));

export const currentSupervisor = cache(async () => {
  const session = await getCurrentUserSession();
  if (!session) {
    return null;
  }
  const membership = requireRole(session, ImplementerRole.SUPERVISOR);
  if (!membership) {
    return null;
  }

  const { identifier } = membership;
  if (!identifier) {
    return null;
  }

  const projectId = await getActiveProjectId();

  const supervisor = await db.query.supervisor.findFirst({
    where: (s, { eq }) => eq(s.id, identifier),
    with: {
      hub: {
        with: {
          schools: {
            with: {
              interventionSessions: true,
            },
          },
        },
      },
      assignedSchools: {
        where: (school, { inArray }) =>
          inArray(
            school.hubId,
            db.select({ id: hub.id }).from(hub).where(eq(hub.projectId, projectId)),
          ),
        with: {
          interventionSessions: true,
        },
      },
      fellows: {
        with: {
          hub: true,
          fellowAttendances: {
            with: {
              repaymentRequests: true,
            },
          },
          fellowComplaints: true,
          fellowReportingNotes: {
            with: {
              supervisor: true,
            },
          },
          repaymentRequests: {
            with: {
              fellowAttendance: {
                with: {
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

  const fellowIds = supervisor.fellows.map((fellow) => fellow.id);
  const fellowAvgRatings =
    fellowIds.length === 0
      ? []
      : await db
          .select({
            fellowId: weeklyFellowRatings.fellowId,
            behaviourRating: avg(weeklyFellowRatings.behaviourRating).mapWith(nullableNumber),
            programDeliveryRating: avg(weeklyFellowRatings.programDeliveryRating).mapWith(
              nullableNumber,
            ),
            dressingAndGroomingRating: avg(weeklyFellowRatings.dressingAndGroomingRating).mapWith(
              nullableNumber,
            ),
            punctualityRating: avg(weeklyFellowRatings.punctualityRating).mapWith(nullableNumber),
          })
          .from(weeklyFellowRatings)
          .where(inArray(weeklyFellowRatings.fellowId, fellowIds))
          .groupBy(weeklyFellowRatings.fellowId);

  const newFellowsData = supervisor.fellows.map((fellow) => {
    const ratings = fellowAvgRatings.find((i) => i.fellowId === fellow.id);
    return {
      ...fellow,
      behaviourRating: ratings?.behaviourRating,
      programDeliveryRating: ratings?.programDeliveryRating,
      dressingAndGroomingRating: ratings?.dressingAndGroomingRating,
      punctualityRating: ratings?.punctualityRating,
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
  const membership = requireRole(session, ImplementerRole.SUPERVISOR);
  if (!membership?.identifier) {
    return null;
  }
  const { identifier } = membership;

  const supervisor = await db.query.supervisor.findFirst({
    where: (s, { eq }) => eq(s.id, identifier),
    columns: { id: true, hubId: true },
    with: { hub: { columns: { projectId: true } } },
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
  const membership = requireRole(session, ImplementerRole.FELLOW);
  if (!membership?.identifier) {
    return null;
  }
  const { identifier } = membership;

  const fellow = await db.query.fellow.findFirst({
    where: (f, { eq }) => eq(f.id, identifier),
    with: { hub: true },
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
  const membership = requireRole(session, ImplementerRole.CLINICAL_LEAD);
  if (!membership) {
    return null;
  }

  const { identifier } = membership;
  if (!identifier) {
    return null;
  }

  const clinicalLead = await db.query.clinicalLead.findFirst({
    where: (cl, { eq }) => eq(cl.id, identifier),
    with: {
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

  const membership = requireRole(session, ImplementerRole.CLINICAL_TEAM);
  if (!membership) {
    return null;
  }

  const { identifier } = membership;
  if (!identifier) {
    return null;
  }

  const clinicalTeam = await db.query.clinicalTeam.findFirst({
    where: (ct, { eq }) => eq(ct.id, identifier),
    with: {
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

  const membership = requireRole(session, ImplementerRole.OPERATIONS);
  if (!membership) {
    return null;
  }

  const { identifier } = membership;
  if (!identifier) {
    return null;
  }

  const opsUser = await db.query.opsUser.findFirst({
    where: (o, { eq }) => eq(o.id, identifier),
    with: {
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

  const membership = requireRole(session, ImplementerRole.ADMIN);
  if (!membership) {
    return null;
  }

  const { identifier } = membership;
  if (!identifier) {
    return null;
  }

  const adminUser = await db.query.adminUser.findFirst({
    where: (a, { eq }) => eq(a.id, identifier),
  });

  if (!adminUser) {
    return null;
  }

  return { profile: adminUser, session };
});

export async function getCurrentUserSession() {
  const session = await getCachedSession();
  if (!session?.user.id) {
    return null;
  }

  if (!session.user.activeMembership) {
    await db.delete(sessionTable).where(eq(sessionTable.userId, session.user.id));
    redirect(`/login?error=${encodeURIComponent("No active membership for this account")}`);
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
