"use server";

import { getCurrentUserSession } from "#/app/auth";
import { db } from "#/db/client";
import { ImplementerRole } from "#/db/enums";
import type { JWTMembership } from "#/lib/auth/session-user";
import { constants } from "#/lib/constants";
import type { Personnel } from "#/lib/types/personnel";

export async function fetchImplementerPersonnel(_membership: JWTMembership) {
  // This is a development-only impersonation helper for the RoleSwitcher. An exported
  // "use server" function is a public endpoint in every build, so the switcher's
  // client-side dev-only render is not a gate: enforce it on the server.
  if (constants.NEXT_PUBLIC_ENV !== "development") {
    throw new Error("Personnel switching is only available in development");
  }
  const session = await getCurrentUserSession();
  if (!session?.user.activeMembership) {
    throw new Error("Session not found");
  }
  // Scope to the caller's own implementer from the session; never trust the argument.
  const { activeMembership } = session.user;

  const implementerMembers = await db.query.implementerMember.findMany({
    where: (m, { eq }) => eq(m.implementerId, activeMembership.implementerId),
    with: { user: true },
  });
  const memberIds = implementerMembers.map((member) => member.identifier || "");

  const admins: Personnel[] = (
    await db.query.adminUser.findMany({
      where: (a, { inArray }) => inArray(a.id, memberIds),
      orderBy: (a, { asc }) => asc(a.adminName),
    })
  ).map((admin) => ({
    id: admin.id,
    role: ImplementerRole.ADMIN,
    label: `${admin.adminName}`,
  }));

  const supervisors: Personnel[] = (
    await db.query.supervisor.findMany({
      where: (s, { inArray }) => inArray(s.id, memberIds),
      orderBy: (s, { asc }) => asc(s.supervisorName),
      with: { hub: { with: { project: true } } },
    })
  ).map((sup) => ({
    id: sup.id,
    role: ImplementerRole.SUPERVISOR,
    label: `${sup.supervisorName}`,
    hub: sup.hub?.hubName,
    project: sup.hub?.project?.name,
  }));

  const hubCoordinators: Personnel[] = (
    await db.query.hubCoordinator.findMany({
      where: (hc, { inArray }) => inArray(hc.id, memberIds),
      orderBy: (hc, { asc }) => asc(hc.coordinatorName),
      with: { assignedHub: { with: { project: true } } },
    })
  ).map((hc) => ({
    id: hc.id,
    role: ImplementerRole.HUB_COORDINATOR,
    label: `${hc.coordinatorName}`,
    hub: hc.assignedHub?.hubName,
    project: hc.assignedHub?.project?.name,
  }));

  const fellows: Personnel[] = (
    await db.query.fellow.findMany({
      where: (f, { inArray }) => inArray(f.id, memberIds),
      orderBy: (f, { desc }) => desc(f.fellowName),
      with: { hub: { with: { project: true } } },
    })
  ).map((fellow) => ({
    id: fellow.id,
    role: ImplementerRole.FELLOW,
    label: `${fellow.fellowName}`,
    hub: fellow.hub?.hubName,
    project: fellow.hub?.project?.name,
  }));

  const clinicalLeads: Personnel[] = (
    await db.query.clinicalLead.findMany({
      where: (cl, { inArray }) => inArray(cl.id, memberIds),
      orderBy: (cl, { asc }) => asc(cl.clinicalLeadName),
      with: { assignedHub: { with: { project: true } } },
    })
  ).map((cl) => ({
    id: cl.id,
    role: ImplementerRole.CLINICAL_LEAD,
    label: `${cl.clinicalLeadName}`,
    hub: cl.assignedHub?.hubName,
    project: cl.assignedHub?.project?.name,
  }));

  const clinicalTeams: Personnel[] = (
    await db.query.clinicalTeam.findMany({
      where: (ct, { inArray }) => inArray(ct.id, memberIds),
      orderBy: (ct, { asc }) => asc(ct.name),
      with: { assignedHub: { with: { project: true } } },
    })
  ).map((ct) => ({
    id: ct.id,
    role: ImplementerRole.CLINICAL_TEAM,
    label: `${ct.name}`,
    hub: ct.assignedHub?.hubName,
    project: ct.assignedHub?.project?.name,
  }));

  const opsUsers: Personnel[] = (
    await db.query.opsUser.findMany({
      where: (o, { inArray }) => inArray(o.id, memberIds),
      orderBy: (o, { asc }) => asc(o.name),
      with: { assignedHub: { with: { project: true } } },
    })
  ).map((ops) => ({
    id: ops.id,
    role: ImplementerRole.OPERATIONS,
    label: `${ops.name}`,
    hub: ops.assignedHub?.hubName,
    project: ops.assignedHub?.project?.name,
  }));

  const personnel = [
    ...admins,
    ...hubCoordinators,
    ...supervisors,
    ...fellows,
    ...clinicalLeads,
    ...opsUsers,
    ...clinicalTeams,
  ];

  const activePersonnelId = activeMembership.identifier || "";

  return { personnel, activePersonnelId };
}

export type ImplementerPersonnel = Awaited<ReturnType<typeof fetchImplementerPersonnel>>;

export async function isCurrentUserAdmin() {
  // Derive the email from the session; never accept it from the caller. Otherwise any
  // caller could probe whether an arbitrary email is an admin.
  const session = await getCurrentUserSession();
  const email = session?.user.email;
  if (!email) {
    return false;
  }
  const adminUser = await db.query.adminUser.findFirst({
    where: (a, { eq }) => eq(a.email, email),
  });
  return adminUser !== undefined;
}
