import { db } from "#/lib/db";

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
  const supervisor = await db.supervisor.findFirst({
    where: {
      visibleId: "SPV23_S_25",
    },
    include: {
      assignedSchool: true,
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
