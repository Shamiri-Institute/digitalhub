import type { ImplementerRole } from "@prisma/client";

import { db } from "#/lib/db";
import { getDefaultProjectId } from "#/lib/default-project-id";

export interface JWTMembership {
  id: number;
  implementerId: string;
  implementerName: string;
  role: ImplementerRole;
  identifier: string | null;
  updatedAt?: Date;
}

export type SessionUser = {
  id: string | null;
  email: string | null;
  name: string | null;
  image: string | null;
  activeMembership?: JWTMembership;
  memberships?: JWTMembership[];
  activeProjectId?: string | null;
};

export async function loadSessionUser(userId: string): Promise<SessionUser | null> {
  const [defaultProjectId, user] = await Promise.all([
    getDefaultProjectId(),
    db.user.findUnique({
      where: { id: userId, archivedAt: null },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        activeProjectId: true,
        memberships: {
          select: {
            id: true,
            role: true,
            identifier: true,
            updatedAt: true,
            implementer: {
              select: { id: true, implementerName: true, hubs: { select: { projectId: true } } },
            },
          },
          orderBy: { updatedAt: { sort: "desc", nulls: "last" } },
        },
      },
    }),
  ]);
  if (!user) {
    return null;
  }

  const activeProjectId = user.activeProjectId ?? defaultProjectId;
  let inProject = user.memberships.filter((m) =>
    m.implementer.hubs.some((h) => h.projectId === activeProjectId),
  );
  if (inProject.length === 0) {
    inProject = user.memberships.filter((m) => m.role === "ADMIN");
  }

  // Ordered by updatedAt desc; setActiveMembership bumps updatedAt, so the first row is active.
  const memberships = inProject.map((m) => ({
    id: m.id,
    implementerId: m.implementer.id,
    implementerName: m.implementer.implementerName,
    role: m.role,
    identifier: m.identifier,
    updatedAt: m.updatedAt ?? undefined,
  }));

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    image: user.image,
    activeMembership: memberships[0],
    memberships,
    activeProjectId,
  };
}
