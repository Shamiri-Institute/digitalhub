import { getServerSession } from "next-auth";

import { db } from "#/lib/db";

export async function currentHub() {
  return await db.hub.findFirst();
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
    throw new Error("No identifier");
  }

  const supervisor = await db.supervisor.findFirst({
    where: { id: identifier },
    include: {
      hub: true,
      assignedSchool: true,
      fellows: {
        include: {
          hub: true,
          fellowAttendances: true,
        },
      },
    },
  });

  if (!supervisor) {
    throw new Error("No supervisor found");
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
    where: { email: session.user.email },
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
