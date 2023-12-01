import { db } from "#/lib/db";
import { getServerSession } from "next-auth";

export interface CurrentUser {
  email: string | null;
  name: string | null;
  activeOrgId: string;
  organizations: {
    id: string;
    name: string;
    roles: {
      id: string;
      name: string;
      description: string;
    }[];
  }[];
  avatarUrl: string | null;
  isRole: (role: string) => boolean;
}

export async function currentHub() {
  return await db.hub.findFirst();
}

export async function currentSupervisor() {
  const { membership } = await getCurrentUser();
  const { identifier } = membership;
  if (!identifier) {
    throw new Error("No identifier");
  }

  const supervisor = await db.supervisor.findFirst({
    where: { id: identifier },
    include: { assignedSchool: true },
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

export async function getCurrentUser() {
  const session = await getServerSession();
  if (!session) {
    throw new Error("No session");
  }

  const user = await db.user.findUniqueOrThrow({
    where: { email: session.user.email },
    include: { memberships: true },
  });

  // TODO: add membership to session to know which implementer user logged in for
  const membership = user.memberships[0];
  if (!membership) {
    throw new Error("No membership");
  }

  return { session, user, membership };
}
