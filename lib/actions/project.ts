"use server";

import { and, eq, inArray } from "drizzle-orm";
import { refresh } from "next/cache";

import { getCurrentUserSession } from "#/app/auth";
import { db } from "#/db/client";
import { project, user } from "#/db/schema";
import { projectsAdministeredBy } from "#/lib/auth/admin-access";

export async function setActiveProject(
  projectId: string,
): Promise<{ success: boolean; error?: string }> {
  const session = await getCurrentUserSession();
  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  const [administeredProject] = await db
    .select({ id: project.id })
    .from(project)
    .where(
      and(eq(project.id, projectId), inArray(project.id, projectsAdministeredBy(session.user.id))),
    );
  if (!administeredProject) {
    return { success: false, error: "Project not found" };
  }

  await db.update(user).set({ activeProjectId: projectId }).where(eq(user.id, session.user.id));

  refresh();

  return { success: true };
}
