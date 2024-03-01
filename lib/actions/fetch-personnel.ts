"use server";

import { getCurrentUser } from "#/app/auth";
import { db } from "#/lib/db";

export async function fetchPersonnel() {
  const supervisors: {
    id: string;
    type: "supervisor" | "hc";
    label: string;
  }[] = (
    await db.supervisor.findMany({
      orderBy: { supervisorName: "desc" },
      where: {
        assignedSchools: { some: { NOT: { assignedSupervisorId: null } } },
      },
    })
  ).map((sup) => ({
    id: sup.id,
    type: "supervisor",
    label: `${sup.supervisorName} - ${sup.visibleId}`,
  }));

  const hubCoordinators: {
    id: string;
    type: "supervisor" | "hc";
    label: string;
  }[] = (
    await db.hubCoordinator.findMany({
      orderBy: { coordinatorName: "desc" },
    })
  ).map((hc) => ({
    id: hc.id,
    type: "hc" as const,
    label: `${hc.coordinatorName} - ${hc.visibleId}`,
  }));
  const personnel = [...supervisors, ...hubCoordinators];

  const user = await getCurrentUser();
  if (!user) {
    return null;
  }
  const { membership } = user;

  const activePersonnelId = membership.identifier || "";

  return { personnel, activePersonnelId };
}
