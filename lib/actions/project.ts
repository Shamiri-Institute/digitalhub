"use server";

import { ImplementerRole } from "@prisma/client";
import { getCurrentUserSession } from "#/app/auth";
import { db } from "#/lib/db";

export type ProjectOption = {
  id: string;
  name: string;
  visibleId: string;
};

export async function fetchProjects(): Promise<ProjectOption[]> {
  const session = await getCurrentUserSession();
  if (!session) return [];

  if (session.user.activeMembership?.role !== ImplementerRole.ADMIN) return [];

  const projects = await db.project.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, visibleId: true },
  });

  return projects;
}

export async function setActiveProject(
  projectId: string,
): Promise<{ success: boolean; error?: string }> {
  const session = await getCurrentUserSession();
  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  if (session.user.activeMembership?.role !== ImplementerRole.ADMIN) {
    return { success: false, error: "Unauthorized" };
  }

  const project = await db.project.findUnique({
    where: { id: projectId },
    select: { id: true },
  });
  if (!project) {
    return { success: false, error: "Project not found" };
  }

  await db.user.update({
    where: { id: session.user.id },
    data: { activeProjectId: projectId },
  });

  return { success: true };
}
