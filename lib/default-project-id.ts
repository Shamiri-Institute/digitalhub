import { cache } from "react";

import { db } from "#/db/client";

export const getDefaultProjectId = cache(async (): Promise<string> => {
  const defaultProject = await db.query.project.findFirst({
    where: (p, { eq }) => eq(p.isDefault, true),
    columns: { id: true },
  });
  if (defaultProject) return defaultProject.id;

  const fallback = await db.query.project.findFirst({
    orderBy: (p, { desc }) => desc(p.createdAt),
    columns: { id: true },
  });
  if (!fallback) {
    throw new Error("No projects exist in the database");
  }
  return fallback.id;
});
