"use server";

import { getCurrentUser } from "#/app/auth";
import { Personnel } from "#/app/dev-personnel-switcher";
import { db } from "#/lib/db";
import { ImplementerRole } from "@prisma/client";

export async function fetchPersonnel() {
  const supervisors: Personnel[] = (
    await db.supervisor.findMany({
      orderBy: { supervisorName: "desc" },
      where: {
        assignedSchools: { some: { NOT: { assignedSupervisorId: null } } },
      },
      include: {
        hub: {
          include: {
            project: true,
          },
        },
      },
    })
  ).map((sup) => ({
    id: sup.id,
    role: ImplementerRole.SUPERVISOR,
    label: `${sup.supervisorName} - ${sup.visibleId}`,
    hub: sup.hub?.hubName,
    project: sup.hub?.project?.name,
  }));

  const hubCoordinators: Personnel[] = (
    await db.hubCoordinator.findMany({
      orderBy: { coordinatorName: "desc" },
      include: {
        assignedHub: {
          include: {
            project: true,
          },
        },
      },
    })
  ).map((hc) => ({
    id: hc.id,
    role: ImplementerRole.HUB_COORDINATOR,
    label: `${hc.coordinatorName} - ${hc.visibleId}`,
    hub: hc.assignedHub?.hubName,
    project: hc.assignedHub?.project?.name,
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
