import { cache } from "react";

import { db } from "#/lib/db";

export const getDefaultProjectId = cache(async (): Promise<string> => {
  const defaultProject = await db.project.findFirst({
    where: { isDefault: true },
    select: { id: true },
  });
  if (defaultProject) return defaultProject.id;

  const fallback = await db.project.findFirst({
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
  if (!fallback) {
    throw new Error("No projects exist in the database");
  }
  return fallback.id;
});
