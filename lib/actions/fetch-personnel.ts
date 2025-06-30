"use server";

import { getCurrentUser } from "#/app/auth";
import type { Personnel } from "#/components/common/dev-personnel-switcher";
import { db } from "#/lib/db";
import { ImplementerRole } from "@prisma/client";

export async function fetchPersonnel() {
  const supervisors: Personnel[] = (
    await db.supervisor.findMany({
      orderBy: { supervisorName: "asc" },
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
    label: `${sup.supervisorName}`,
    hub: sup.hub?.hubName,
    project: sup.hub?.project?.name,
  }));

  const hubCoordinators: Personnel[] = (
    await db.hubCoordinator.findMany({
      orderBy: { coordinatorName: "asc" },
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
    label: `${hc.coordinatorName}`,
    hub: hc.assignedHub?.hubName,
    project: hc.assignedHub?.project?.name,
  }));

  const fellows: Personnel[] = (
    await db.fellow.findMany({
      orderBy: { fellowName: "desc" },
      include: {
        hub: {
          include: {
            project: true,
          },
        },
      },
    })
  ).map((fellow) => ({
    id: fellow.id,
    role: ImplementerRole.FELLOW,
    label: `${fellow.fellowName}`,
    hub: fellow.hub?.hubName,
    project: fellow.hub?.project?.name,
  }));

  const clinicalLeads: Personnel[] = (
    await db.clinicalLead.findMany({
      orderBy: { clinicalLeadName: "asc" },
      include: {
        assignedHub: {
          include: {
            project: true,
          },
        },
      },
    })
  ).map((cl) => ({
    id: cl.id,
    role: ImplementerRole.CLINICAL_LEAD,
    label: `${cl.clinicalLeadName}`,
    hub: cl.assignedHub?.hubName,
    project: cl.assignedHub?.project?.name,
  }));

  const opsUsers: Personnel[] = (
    await db.opsUser.findMany({
      orderBy: { name: "asc" },
      include: {
        assignedHub: {
          include: {
            project: true,
          },
        },
      },
    })
  ).map((ops) => ({
    id: ops.id,
    role: ImplementerRole.OPERATIONS,
    label: `${ops.name}`,
    hub: ops.assignedHub?.hubName,
    project: ops.assignedHub?.project?.name,
  }));

  const clinicalTeams: Personnel[] = (
    await db.clinicalTeam.findMany({
      orderBy: { name: "asc" },
      include: {
        assignedHub: {
          include: {
            project: true,
          },
        },
      },
    })
  ).map((ct) => ({
    id: ct.id,
    role: ImplementerRole.CLINICAL_TEAM,
    label: `${ct.name}`,
    hub: ct.assignedHub?.hubName,
    project: ct.assignedHub?.project?.name,
  }));

  const personnel = [...hubCoordinators, ...supervisors, ...fellows, ...clinicalLeads, ...opsUsers];

  const user = await getCurrentUser();
  if (!user) {
    return null;
  }
  const { membership } = user;

  const activePersonnelId = membership.identifier || "";

  return { personnel, activePersonnelId };
}
