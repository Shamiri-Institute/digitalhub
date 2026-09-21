/**
 * @deprecated This script is deprecated. It can still be run directly to generate
 * session names in a database (e.g. after adding new hubs without re-seeding).
 */

import { db, pool } from "#/db/client";
import { sessionName } from "#/db/schema";
import { hubSessionTypes } from "#/db/seed/hub-session-types";
import { getDefaultProjectId } from "#/lib/default-project-id";

async function main() {
  let projectId: string;
  try {
    projectId = await getDefaultProjectId();
  } catch {
    console.warn("No projects exist in the database. Skipping session name generation.");
    return;
  }

  const project = await db.query.project.findFirst({
    where: (p, { eq }) => eq(p.id, projectId),
  });

  if (!project) {
    console.warn(`Project with id "${projectId}" not found. Skipping session name generation.`);
    return;
  }

  const hubs = await db.query.hub.findMany({
    where: (hub, { eq }) => eq(hub.projectId, project.id),
  });

  if (hubs.length === 0) {
    console.warn(`No hubs found for project "${projectId}". Skipping session name generation.`);
    return;
  }

  const sessions = hubs.map((hub) => {
    return hubSessionTypes.map((sessionType) => ({
      sessionType: sessionType.type,
      sessionName: sessionType.name,
      sessionLabel: sessionType.label,
      hubId: hub.id,
      currency: "KES",
      amount: sessionType.amount,
    }));
  });

  await db.insert(sessionName).values(sessions.flat()).onConflictDoNothing();
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => void pool.end());
