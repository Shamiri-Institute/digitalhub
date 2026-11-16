import type { Page } from "@playwright/test";
import { eq, sql } from "drizzle-orm";

import { db } from "#/db/client";
import { plainAdminEmail } from "#/db/seed/fixtures";
import { fellow, hub, interventionSession, school, sessionName, user } from "#/db/schema";
import { objectId } from "#/lib/crypto";
import { createProjectWithHub } from "#/tests/access-helpers";
import { expect, test } from "#/tests/fixtures";
import { createAdminCopy, required, signInWithEmail } from "#/tests/helpers";
import { getUrl, rowWithCell, scheduleUrl } from "#/tests/pages/helpers";

async function plainAdminCopy() {
  const seeded = await db.query.user.findFirst({
    where: (u, { eq }) => eq(u.email, plainAdminEmail),
    columns: { id: true },
    with: { memberships: { columns: { implementerId: true } } },
  });
  const adminImplementerId = seeded?.memberships[0]?.implementerId;
  required(adminImplementerId, `${plainAdminEmail} with an ADMIN membership`);
  const copy = await createAdminCopy(seeded?.id ?? "");
  return { ...copy, adminImplementerId };
}

async function defaultProject() {
  const defaultProjectRow = await db.query.project.findFirst({
    where: (p, { eq }) => eq(p.isDefault, true),
    columns: { id: true, name: true },
  });
  required(defaultProjectRow, "a default project");
  return defaultProjectRow;
}

function headerButton(page: Page, text: string) {
  return page.getByRole("button").filter({ hasText: text, visible: true }).first();
}

async function listedHubNames(page: Page) {
  await page.goto(getUrl("/admin/hubs"));
  await expect(page.getByRole("heading", { name: "Hubs" })).toBeVisible();
  const labels = await page
    .getByRole("link", { name: /^Open / })
    .evaluateAll((links) => links.map((link) => link.getAttribute("aria-label") ?? ""));
  return labels.map((label) => label.replace(/^Open /, "")).toSorted();
}

test("an admin sees only the hubs, schools and sessions of their implementer in the active project", async ({
  page,
  context,
  undo,
}) => {
  const admin = await plainAdminCopy();
  const otherProject = await createProjectWithHub(admin.adminImplementerId);
  undo(otherProject.remove);
  undo(admin.remove);
  const activeProject = await defaultProject();
  const { rows: ownHubs } = await db.execute<{ id: string; hubName: string }>(sql`
    select id, hub_name as "hubName" from hubs
    where implementer_id = ${admin.adminImplementerId} and project_id = ${activeProject.id}
    order by id`);
  const [ownHub] = ownHubs;
  required(ownHub, "a hub of the admin's implementer in the default project");
  const foreignSchool = await db
    .select({ visibleId: school.visibleId })
    .from(school)
    .innerJoin(hub, eq(hub.id, school.hubId))
    .where(sql`${hub.implementerId} <> ${admin.adminImplementerId}`)
    .limit(1);
  required(foreignSchool[0], "a school of another implementer");

  // Sessions are not scheduled from the admin pages, so the spec inserts one at the other
  // project's school, today.
  const [otherSessionType] = await db
    .insert(sessionName)
    .values({
      hubId: otherProject.hubId,
      sessionName: "s1",
      sessionLabel: "Session 1",
      sessionType: "INTERVENTION",
      amount: 0,
    })
    .returning({ id: sessionName.id });
  required(otherSessionType, "the inserted session type");
  const today = new Date();
  await db.insert(interventionSession).values({
    id: objectId("session"),
    hubId: otherProject.hubId,
    schoolId: otherProject.schoolVisibleId,
    sessionId: otherSessionType.id,
    projectId: otherProject.projectId,
    occurred: false,
    yearOfImplementation: today.getFullYear(),
    sessionDate: today,
  });
  undo(async () => {
    await db.delete(interventionSession).where(eq(interventionSession.hubId, otherProject.hubId));
    await db.delete(sessionName).where(eq(sessionName.hubId, otherProject.hubId));
  });

  await signInWithEmail(context, admin.email);
  expect(await listedHubNames(page)).toEqual(ownHubs.map((h) => h.hubName).toSorted());

  const otherProjectHub = await page.goto(getUrl(`/admin/hubs/${otherProject.hubId}/schools`));
  expect(otherProjectHub?.status()).toBe(404);
  await page.goto(getUrl(`/admin/schools/${otherProject.schoolVisibleId}/sessions`));
  await expect(page.getByText("This page could not be found.")).toBeVisible();
  await page.goto(getUrl(`/admin/schools/${foreignSchool[0].visibleId}/sessions`));
  await expect(page.getByText("This page could not be found.")).toBeVisible();

  const scheduleToday = await scheduleUrl(context, "/admin/schedule?mode=list", today);
  await page.goto(scheduleToday);
  await expect(page.getByRole("main")).toBeVisible();
  await expect(page.getByText(otherProject.schoolName)).toHaveCount(0);

  await page.goto(getUrl("/admin/hubs"));
  await headerButton(page, activeProject.name).click();
  await page.getByRole("option").filter({ hasText: otherProject.projectName }).click();
  await expect(headerButton(page, otherProject.projectName)).toBeVisible();

  expect(await listedHubNames(page)).toEqual([otherProject.hubName]);
  const ownHubPage = await page.goto(getUrl(`/admin/hubs/${ownHub.id}/schools`));
  expect(ownHubPage?.status()).toBe(404);
  await page.goto(getUrl(`/admin/hubs/${otherProject.hubId}/schools`));
  await expect(page.getByRole("heading", { name: otherProject.hubName })).toBeVisible();
  await page.goto(scheduleToday);
  await expect(page.getByText(otherProject.schoolName).first()).toBeVisible();
});

test("a hub's fellows tab lists the hub's fellows, whatever implementer the fellow names", async ({
  page,
  context,
  undo,
}) => {
  const admin = await plainAdminCopy();
  const otherProject = await createProjectWithHub(admin.adminImplementerId);
  undo(otherProject.remove);
  undo(admin.remove);
  const foreignImplementer = await db.query.implementer.findFirst({
    where: (i, { ne }) => ne(i.id, admin.adminImplementerId),
    columns: { id: true },
  });
  required(foreignImplementer, "a second implementer");
  const fellowName = `E2E fellow ${Date.now()}`;
  const fellowId = objectId("fellow");
  // Fellows join a hub from the hub coordinator's pages; the spec inserts one with another
  // implementer's id so only its hub ties it to the admin.
  await db.insert(fellow).values({
    id: fellowId,
    fellowName,
    hubId: otherProject.hubId,
    implementerId: foreignImplementer.id,
  });
  undo(() => db.delete(fellow).where(eq(fellow.id, fellowId)));
  await db
    .update(user)
    .set({ activeProjectId: otherProject.projectId })
    .where(eq(user.id, admin.id));

  await signInWithEmail(context, admin.email);
  await page.goto(getUrl(`/admin/hubs/${otherProject.hubId}/fellows`));
  await expect(await rowWithCell(page, page.getByRole("main"), fellowName)).toHaveCount(1);
});

test("an admin cannot switch to a project that no longer holds a hub of their implementer", async ({
  page,
  context,
  undo,
}) => {
  const admin = await plainAdminCopy();
  const otherProject = await createProjectWithHub(admin.adminImplementerId);
  undo(otherProject.remove);
  undo(admin.remove);
  const activeProject = await defaultProject();

  await signInWithEmail(context, admin.email);
  await page.goto(getUrl("/admin/hubs"));
  await headerButton(page, activeProject.name).click();
  const otherProjectOption = page.getByRole("option").filter({ hasText: otherProject.projectName });
  await expect(otherProjectOption).toBeVisible();

  // The hub leaves the project while the switcher is open, so the server sees a project the
  // admin no longer administers.
  await db.delete(school).where(eq(school.hubId, otherProject.hubId));
  await db.delete(hub).where(eq(hub.id, otherProject.hubId));
  await otherProjectOption.click();
  await expect(page.getByText("Project not found").first()).toBeVisible();

  await page.reload();
  await expect(headerButton(page, activeProject.name)).toBeVisible();
  await expect(headerButton(page, otherProject.projectName)).toHaveCount(0);
});
