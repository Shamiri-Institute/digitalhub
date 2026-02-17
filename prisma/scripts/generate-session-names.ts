/**
 * @deprecated This script is deprecated. It can still be run directly to generate
 * session names in a database (e.g. after adding new hubs without re-seeding).
 */

import { getDefaultProjectId } from "#/lib/active-project-id";
import { db } from "#/lib/db";
import { hubSessionTypes } from "#/prisma/scripts/hub-session-types";

async function main() {
  let projectId: string;
  try {
    projectId = await getDefaultProjectId();
  } catch {
    console.warn("No projects exist in the database. Skipping session name generation.");
    return;
  }

  const project = await db.project.findUnique({
    where: { id: projectId },
  });

  if (!project) {
    console.warn(`Project with id "${projectId}" not found. Skipping session name generation.`);
    return;
  }

  const hubs = await db.hub.findMany({
    where: {
      projectId: project.id,
    },
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

  await db.sessionName.createMany({
    data: sessions.flat(),
    skipDuplicates: true,
  });
}

void main();
