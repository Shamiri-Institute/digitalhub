"use server";

import { getCurrentUserSession } from "#/app/auth";
import { isAdminUserByEmail } from "#/lib/actions/fetch-personnel";
import { db } from "#/lib/db";

export type ProjectOption = {
  id: string;
  name: string;
  visibleId: string;
};

export async function fetchProjects(): Promise<ProjectOption[]> {
  const session = await getCurrentUserSession();
  if (!session) return [];

  const isAdmin = await isAdminUserByEmail(session.user.email ?? "");
  if (!isAdmin) return [];

  const projects = await db.project.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, visibleId: true },
  });

  return projects;
}
