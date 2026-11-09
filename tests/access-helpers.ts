import { eq } from "drizzle-orm";

import { db } from "#/db/client";
import { superAdminEmail } from "#/db/seed/fixtures";
import { adminUser, hub, project, school } from "#/db/schema";
import { objectId } from "#/lib/crypto";
import { createAdminCopy } from "#/tests/helpers";

/** A new super admin of each implementer the seeded super admin belongs to. */
export async function createSuperAdminCopy() {
  const seeded = await db.query.user.findFirst({
    where: (u, { eq }) => eq(u.email, superAdminEmail),
    columns: { id: true },
  });
  if (!seeded) throw new Error(`seed the database first: no user ${superAdminEmail}`);
  const copy = await createAdminCopy(seeded.id);
  await db.update(adminUser).set({ isSuperAdmin: true }).where(eq(adminUser.email, copy.email));
  return copy;
}

/**
 * A new project holding one hub of `implementerId` with one school, so a spec can show what an
 * admin sees in a project other than the active one. `remove` deletes all three; remove any user
 * whose active project it is first.
 */
export async function createProjectWithHub(implementerId: string) {
  const label = `E2E ${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const [createdProject] = await db
    .insert(project)
    .values({ name: `${label} project`, visibleId: objectId("proj") })
    .returning({ id: project.id, name: project.name });
  if (!createdProject) throw new Error("could not insert the project");
  const hubId = objectId("hub");
  const hubName = `${label} hub`;
  await db.insert(hub).values({ id: hubId, hubName, implementerId, projectId: createdProject.id });
  const schoolId = objectId("school");
  const schoolName = `${label} school`;
  await db.insert(school).values({ id: schoolId, visibleId: schoolId, schoolName, hubId: hubId });

  async function remove() {
    await db.delete(school).where(eq(school.id, schoolId));
    await db.delete(hub).where(eq(hub.id, hubId));
    await db.delete(project).where(eq(project.id, createdProject?.id ?? ""));
  }

  return {
    projectId: createdProject.id,
    projectName: createdProject.name,
    hubId,
    hubName,
    schoolVisibleId: schoolId,
    schoolName,
    remove,
  };
}
