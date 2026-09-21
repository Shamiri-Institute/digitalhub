"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { getCurrentUserSession } from "#/app/auth";
import { db } from "#/db/client";
import { ImplementerRole } from "#/db/enums";
import { user } from "#/db/schema";

export type ProjectOption = {
  id: string;
  name: string;
  visibleId: string;
};

export async function fetchProjects(): Promise<ProjectOption[]> {
  const session = await getCurrentUserSession();
  if (!session) return [];

  if (session.user.activeMembership?.role !== ImplementerRole.ADMIN) return [];

  const projects = await db.query.project.findMany({
    orderBy: (p, { desc }) => desc(p.createdAt),
    columns: { id: true, name: true, visibleId: true },
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

  const project = await db.query.project.findFirst({
    where: (p, { eq }) => eq(p.id, projectId),
    columns: { id: true },
  });
  if (!project) {
    return { success: false, error: "Project not found" };
  }

  await db.update(user).set({ activeProjectId: projectId }).where(eq(user.id, session.user.id));

  revalidatePath("/", "layout");

  return { success: true };
}
