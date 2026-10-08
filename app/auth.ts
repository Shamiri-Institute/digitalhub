import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import type { Session } from "next-auth";
import { cache } from "react";

import { db } from "#/db/client";
import { ImplementerRole } from "#/db/enums";
import { session as sessionTable } from "#/db/schema";
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
    with: { assignedHub: true },
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
  const membership = requireRole(session, ImplementerRole.SUPERVISOR);
  if (!membership?.identifier) {
    return null;
  }
  const { identifier } = membership;

  const supervisor = await db.query.supervisor.findFirst({
    where: (s, { eq }) => eq(s.id, identifier),
    with: { hub: { columns: { projectId: true, hubName: true } } },
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

/**
 * The signed-in user's own profile, for the profile dialog in the platform layout. It shares the
 * cached loader the page itself calls, and drops the relations the dialog never reads, so the
 * layout does not send them to the browser.
 */
export const getCurrentPersonnel = cache(async () => {
  const session = await getCurrentUserSession();
  switch (session?.user.activeMembership?.role) {
    case ImplementerRole.SUPERVISOR:
      return currentSupervisor();
    case ImplementerRole.HUB_COORDINATOR: {
      const coordinator = await currentHubCoordinator();
      return (
        coordinator && {
          session: coordinator.session,
          profile: {
            ...coordinator.profile,
            assignedHub: coordinator.profile.assignedHub && {
              hubName: coordinator.profile.assignedHub.hubName,
            },
          },
        }
      );
    }
    case ImplementerRole.FELLOW:
      return currentFellow();
    case ImplementerRole.CLINICAL_LEAD: {
      const clinicalLead = await currentClinicalLead();
      return (
        clinicalLead && {
          session: clinicalLead.session,
          profile: { ...clinicalLead.profile, clinicalScreeningCases: undefined },
        }
      );
    }
    case ImplementerRole.OPERATIONS:
      return currentOpsUser();
    case ImplementerRole.CLINICAL_TEAM:
      return currentClinicalTeam();
    case ImplementerRole.ADMIN:
      return currentAdminUser();
    default:
      return null;
  }
});
