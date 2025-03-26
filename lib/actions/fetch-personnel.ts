"use server";

import { getCurrentUser } from "#/app/auth";
import { Personnel } from "#/app/dev-personnel-switcher";
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
            projects: true,
          },
        },
      },
    })
  ).map((sup) => ({
    id: sup.id,
    role: ImplementerRole.SUPERVISOR,
    label: `${sup.supervisorName}`,
    hub: sup.hub?.hubName,
    // project: sup.hub?.projects[0]?.name,
  }));

  const hubCoordinators: Personnel[] = (
    await db.hubCoordinator.findMany({
      orderBy: { coordinatorName: "asc" },
      include: {
        assignedHub: {
          include: {
            projects: true,
          },
        },
      },
    })
  ).map((hc) => ({
    id: hc.id,
    role: ImplementerRole.HUB_COORDINATOR,
    label: `${hc.coordinatorName}`,
    hub: hc.assignedHub?.hubName,
    // project: hc.assignedHub?.project?.name,
  }));

  const fellows: Personnel[] = (
    await db.fellow.findMany({
      orderBy: { fellowName: "desc" },
      include: {
        hub: {
          include: {
            projects: true,
          },
        },
      },
    })
  ).map((fellow) => ({
    id: fellow.id,
    role: ImplementerRole.FELLOW,
    label: `${fellow.fellowName}`,
    hub: fellow.hub?.hubName,
    // project: fellow.hub?.project?.name,
  }));

  const clinicalLeads: Personnel[] = (
    await db.clinicalLead.findMany({
      orderBy: { clinicalLeadName: "asc" },
      include: {
        assignedHub: {
          include: {
            projects: true,
          },
        },
      },
    })
  ).map((cl) => ({
    id: cl.id,
    role: ImplementerRole.CLINICAL_LEAD,
    label: `${cl.clinicalLeadName}`,
    hub: cl.assignedHub?.hubName,
    // project: cl.assignedHub?.project?.name,
  }));

  const opsUsers: Personnel[] = (
    await db.opsUser.findMany({
      orderBy: { name: "asc" },
      include: {
        assignedHub: {
          include: {
            projects: true,
          },
        },
      },
    })
  ).map((ops) => ({
    id: ops.id,
    role: ImplementerRole.OPERATIONS,
    label: `${ops.name}`,
    hub: ops.assignedHub?.hubName,
    // project: ops.assignedHub?.project?.name,
  }));

  const personnel = [
    ...hubCoordinators,
    ...supervisors,
    ...fellows,
    ...clinicalLeads,
    ...opsUsers,
  ];

  const user = await getCurrentUser();
  if (!user) {
    return null;
  }
  const { membership } = user;

  const activePersonnelId = membership.identifier || "";

  return { personnel, activePersonnelId };
}
