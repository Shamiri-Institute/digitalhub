import { db } from "#/lib/db";

export async function getDefaultProjectId(): Promise<string> {
  const defaultProject = await db.project.findFirst({
    where: { isDefault: true },
    select: { id: true },
  });
  if (defaultProject) return defaultProject.id;

  const fallback = await db.project.findFirst({
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  if (!fallback) {
    throw new Error("No projects exist in the database");
  }
  return fallback.id;
}
