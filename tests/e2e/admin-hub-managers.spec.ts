import type { BrowserContext, Page } from "@playwright/test";
import { eq, inArray, like, sql } from "drizzle-orm";

import { db } from "#/db/client";
import { plainAdminEmail, superAdminEmail } from "#/db/seed/fixtures";
import { adminUser, hub, hubCoordinator, implementerMember, session, user } from "#/db/schema";
import { objectId } from "#/lib/crypto";
import { createProjectWithHub, createSuperAdminCopy } from "#/tests/access-helpers";
import { expect, test } from "#/tests/fixtures";
import { required, signInWithEmail } from "#/tests/helpers";
import { getUrl } from "#/tests/pages/helpers";

const RUN_ID = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const HUB_PREFIX = `E2E Hub Managers ${RUN_ID}`;
const EMAIL_PREFIX = `e2e-hub-manager-${RUN_ID}`;

test.afterAll(async () => {
  const createdHubs = db
    .select({ id: hub.id })
    .from(hub)
    .where(like(hub.hubName, `${HUB_PREFIX}%`));
  const createdManagers = db
    .select({ id: hubCoordinator.id })
    .from(hubCoordinator)
    .where(inArray(hubCoordinator.assignedHubId, createdHubs));
  await db.delete(implementerMember).where(inArray(implementerMember.identifier, createdManagers));
  await db.delete(hubCoordinator).where(inArray(hubCoordinator.assignedHubId, createdHubs));
  await db.delete(user).where(like(user.email, `${EMAIL_PREFIX}%`));
  await db.delete(hub).where(like(hub.hubName, `${HUB_PREFIX}%`));
});

// In the default project, which admins open first.
async function createHub(name: string) {
  const {
    rows: [seededHub],
  } = await db.execute<{ implementerId: string; projectId: string }>(sql`
    select h.implementer_id as "implementerId", h.project_id as "projectId"
    from hubs h
    join projects p on p.id = h.project_id and p.is_default
    join implementer_members m on m.implementer_id = h.implementer_id
    join users u on u.id = m.user_id and u.email = ${superAdminEmail}
    order by h.id
    limit 1`);
  required(seededHub, "a hub of the super admin's implementer in the default project");
  const [createdHub] = await db
    .insert(hub)
    .values({ id: objectId("hub"), hubName: `${HUB_PREFIX} ${name}`, ...seededHub })
    .returning({ id: hub.id, implementerId: hub.implementerId, projectId: hub.projectId });
  required(createdHub, "the inserted hub");
  return createdHub;
}

function managerStatus(page: Page, name: string, status: "Active" | "Archived") {
  return page.getByRole("row", { name }).getByText(status, { exact: true });
}

async function canOpenHubDashboard(context: BrowserContext, email: string) {
  await signInWithEmail(context, email);
  const page = await context.newPage();
  await page.goto(getUrl("/hc/supervisors"));
  const opened = !new URL(page.url()).pathname.startsWith("/login");
  await page.close();
  return opened;
}

test("a super admin adds a hub manager, archives them and restores them", async ({
  page,
  context,
  browser,
}) => {
  const managerHub = await createHub("Flow");
  const managerName = `E2E Manager ${RUN_ID}`;
  const managerEmail = `${EMAIL_PREFIX}-flow@example.com`;
  await signInWithEmail(context, superAdminEmail);
  await page.goto(getUrl(`/admin/hubs/${managerHub.id}/hub-managers`));

  const addManager = async () => {
    await page.getByRole("button", { name: "Add hub manager" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Full name").fill(managerName);
    await dialog.getByLabel("Email address").fill(managerEmail.toUpperCase());
    await dialog.getByLabel("Phone number").fill("0712345678");
    await dialog.getByLabel("ID number").fill("12345678");
    await dialog.getByLabel("Gender").click();
    await page.getByRole("option", { name: "Female" }).click();
    await dialog.getByLabel(/^County/).click();
    await page.getByRole("option").first().click();
    await dialog.getByLabel("Sub-county").click();
    await page.getByRole("option").first().click();
    await dialog.getByRole("button", { name: "Add hub manager" }).click();
    return dialog;
  };

  const addDialog = await addManager();
  await expect(addDialog).toBeHidden();
  await page.reload();
  await expect(managerStatus(page, managerName, "Active")).toBeVisible();

  // The same email, typed in another case, is the same person.
  const duplicateDialog = await addManager();
  await expect(
    page.getByText("This email already belongs to a hub manager of").first(),
  ).toBeVisible();
  await duplicateDialog.getByRole("button", { name: "Cancel" }).click();

  const managerContext = await browser.newContext();
  expect(await canOpenHubDashboard(managerContext, managerEmail)).toBe(true);

  await page.getByRole("button", { name: `Actions for ${managerName}` }).click();
  await page.getByRole("menuitem", { name: "Archive hub manager" }).click();
  const archiveDialog = page.getByRole("dialog");
  await expect(archiveDialog).toContainText("They lose access to the");
  await archiveDialog.getByRole("button", { name: "Archive hub manager" }).click();
  await expect(archiveDialog).toBeHidden();
  await page.reload();
  await expect(managerStatus(page, managerName, "Archived")).toBeVisible();
  expect(await canOpenHubDashboard(managerContext, managerEmail)).toBe(false);

  await page.getByRole("button", { name: `Actions for ${managerName}` }).click();
  await expect(page.getByRole("menuitem", { name: "Archive hub manager" })).toHaveCount(0);
  await page.getByRole("menuitem", { name: `Restore ${managerName}` }).click();
  await expect(page.getByText(`Restored ${managerName}`).first()).toBeVisible();
  await page.reload();
  await expect(managerStatus(page, managerName, "Active")).toBeVisible();
  expect(await canOpenHubDashboard(managerContext, managerEmail)).toBe(true);
  await managerContext.close();
});

test("restoring a hub manager who kept their membership leaves them one", async ({
  page,
  context,
}) => {
  const managerHub = await createHub("Leftover");
  const managerName = `E2E Leftover Manager ${RUN_ID}`;
  const managerEmail = `${EMAIL_PREFIX}-leftover@example.com`;
  const hubManagerId = objectId("coord");
  await db.insert(hubCoordinator).values({
    id: hubManagerId,
    visibleId: hubManagerId,
    coordinatorName: managerName,
    coordinatorEmail: managerEmail,
    implementerId: managerHub.implementerId,
    assignedHubId: managerHub.id,
    archivedAt: new Date(),
  });
  const [managerUser] = await db
    .insert(user)
    .values({ email: managerEmail, name: managerName })
    .returning({ id: user.id });
  required(managerUser, "the inserted user");
  await db.insert(implementerMember).values({
    implementerId: managerHub.implementerId,
    userId: managerUser.id,
    role: "HUB_COORDINATOR",
    identifier: hubManagerId,
  });

  await signInWithEmail(context, superAdminEmail);
  await page.goto(getUrl(`/admin/hubs/${managerHub.id}/hub-managers`));
  await page.getByRole("button", { name: `Actions for ${managerName}` }).click();
  await page.getByRole("menuitem", { name: `Restore ${managerName}` }).click();
  await expect(page.getByText(`Restored ${managerName}`).first()).toBeVisible();
  await page.reload();
  await expect(managerStatus(page, managerName, "Active")).toBeVisible();

  // No page shows how many memberships a person has.
  const memberships = await db
    .select({ id: implementerMember.id })
    .from(implementerMember)
    .where(inArray(implementerMember.identifier, [hubManagerId]));
  expect(memberships).toHaveLength(1);
});

test("an admin who is not a super admin sees the hub managers but cannot change them", async ({
  page,
  context,
}) => {
  const managerHub = await createHub("Read only");
  const activeName = `E2E Current Manager ${RUN_ID}`;
  const archivedName = `E2E Former Manager ${RUN_ID}`;
  const manager = (name: string, slug: string, archivedAt: Date | null) => {
    const id = objectId("coord");
    return {
      id,
      visibleId: id,
      coordinatorName: name,
      coordinatorEmail: `${EMAIL_PREFIX}-${slug}@example.com`,
      implementerId: managerHub.implementerId,
      assignedHubId: managerHub.id,
      archivedAt,
    };
  };
  await db
    .insert(hubCoordinator)
    .values([manager(activeName, "active", null), manager(archivedName, "archived", new Date())]);

  await signInWithEmail(context, plainAdminEmail);
  await page.goto(getUrl(`/admin/hubs/${managerHub.id}/hub-managers`));

  await expect(managerStatus(page, activeName, "Active")).toBeVisible();
  await expect(managerStatus(page, archivedName, "Archived")).toBeVisible();
  await expect(page.getByRole("button", { name: "Add hub manager" })).toHaveCount(0);

  for (const name of [activeName, archivedName]) {
    await page.getByRole("button", { name: `Actions for ${name}` }).click();
    await expect(page.getByRole("menuitem")).toHaveText(["Copy email"]);
    await page.keyboard.press("Escape");
  }
});

async function fillHubManagerForm(page: Page, name: string, email: string) {
  await page.getByRole("button", { name: "Add hub manager" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Full name").fill(name);
  await dialog.getByLabel("Email address").fill(email);
  await dialog.getByLabel("Phone number").fill("0712345678");
  await dialog.getByLabel("ID number").fill("12345678");
  await dialog.getByLabel("Gender").click();
  await page.getByRole("option", { name: "Female" }).click();
  await dialog.getByLabel(/^County/).click();
  await page.getByRole("option").first().click();
  await dialog.getByLabel("Sub-county").click();
  await page.getByRole("option").first().click();
  return dialog;
}

test("an email held by another implementer's hub manager cannot be added", async ({
  page,
  context,
  undo,
}) => {
  const managerHub = await createHub("Other organisation");
  const foreignHub = await db.query.hub.findFirst({
    where: (h, { ne }) => ne(h.implementerId, managerHub.implementerId),
    columns: { id: true, implementerId: true },
  });
  required(foreignHub, "a hub of another implementer");
  const sharedEmail = `${EMAIL_PREFIX}-foreign@example.com`;
  const foreignManagerId = objectId("coord");
  await db.insert(hubCoordinator).values({
    id: foreignManagerId,
    visibleId: foreignManagerId,
    coordinatorName: `E2E Foreign Manager ${RUN_ID}`,
    coordinatorEmail: sharedEmail,
    implementerId: foreignHub.implementerId,
    assignedHubId: foreignHub.id,
  });
  undo(() => db.delete(hubCoordinator).where(eq(hubCoordinator.id, foreignManagerId)));
  const managerName = `E2E Clashing Manager ${RUN_ID}`;

  await signInWithEmail(context, superAdminEmail);
  await page.goto(getUrl(`/admin/hubs/${managerHub.id}/hub-managers`));
  const dialog = await fillHubManagerForm(page, managerName, sharedEmail);
  await dialog.getByRole("button", { name: "Add hub manager" }).click();
  await expect(
    page.getByText("This email belongs to another organisation's hub manager").first(),
  ).toBeVisible();
  await dialog.getByRole("button", { name: "Cancel" }).click();

  await page.reload();
  await expect(page.getByRole("row", { name: managerName })).toHaveCount(0);
});

test("archiving a hub manager keeps the person's other roles", async ({
  page,
  context,
  browser,
  undo,
}) => {
  const managerHub = await createHub("Two roles");
  const managerName = `E2E Two Role Manager ${RUN_ID}`;
  const managerEmail = `${EMAIL_PREFIX}-two-roles@example.com`;
  await signInWithEmail(context, superAdminEmail);
  await page.goto(getUrl(`/admin/hubs/${managerHub.id}/hub-managers`));
  const dialog = await fillHubManagerForm(page, managerName, managerEmail);
  await dialog.getByRole("button", { name: "Add hub manager" }).click();
  await expect(dialog).toBeHidden();

  // The person is also an admin; admins are added on the Users page, which another spec covers.
  const managerUser = await db.query.user.findFirst({
    where: (u, { eq }) => eq(u.email, managerEmail),
    columns: { id: true },
  });
  required(managerUser, "the hub manager's user");
  const [adminProfile] = await db
    .insert(adminUser)
    .values({
      email: managerEmail,
      adminName: managerName,
      implementerId: managerHub.implementerId,
    })
    .returning({ id: adminUser.id });
  required(adminProfile, "the inserted admin profile");
  undo(async () => {
    await db.delete(session).where(eq(session.userId, managerUser.id));
    await db.delete(implementerMember).where(eq(implementerMember.identifier, adminProfile.id));
    await db.delete(adminUser).where(eq(adminUser.id, adminProfile.id));
  });
  await db.insert(implementerMember).values({
    implementerId: managerHub.implementerId,
    userId: managerUser.id,
    role: "ADMIN",
    identifier: adminProfile.id,
    updatedAt: new Date(0),
  });

  await page.reload();
  await page.getByRole("button", { name: `Actions for ${managerName}` }).click();
  await page.getByRole("menuitem", { name: "Archive hub manager" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Archive hub manager" }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await page.reload();
  await expect(managerStatus(page, managerName, "Archived")).toBeVisible();

  const managerContext = await browser.newContext();
  await signInWithEmail(managerContext, managerEmail);
  const managerPage = await managerContext.newPage();
  await managerPage.goto(getUrl("/"));
  await expect(managerPage).toHaveURL(getUrl("/admin/schedule"));
  await managerPage.goto(getUrl("/hc/supervisors"));
  await expect(managerPage).toHaveURL(getUrl("/admin/schedule"));
  await managerContext.close();
});

test("an admin who loses super-admin access cannot add a hub manager from an open form", async ({
  page,
  context,
  undo,
}) => {
  const managerHub = await createHub("Demoted");
  const admin = await createSuperAdminCopy();
  undo(admin.remove);
  const managerName = `E2E Refused Manager ${RUN_ID}`;
  await signInWithEmail(context, admin.email);
  await page.goto(getUrl(`/admin/hubs/${managerHub.id}/hub-managers`));
  const dialog = await fillHubManagerForm(page, managerName, `${EMAIL_PREFIX}-refused@example.com`);

  await db.update(adminUser).set({ isSuperAdmin: false }).where(eq(adminUser.email, admin.email));
  await dialog.getByRole("button", { name: "Add hub manager" }).click();
  await expect(
    page.getByText("Forbidden: this action requires a super admin").first(),
  ).toBeVisible();

  await page.reload();
  await expect(page.getByRole("row", { name: managerName })).toHaveCount(0);
});

test("a hub manager cannot be added to a hub that has left the active project", async ({
  page,
  context,
  undo,
}) => {
  const managerHub = await createHub("Moved");
  const otherProject = await createProjectWithHub(managerHub.implementerId);
  undo(otherProject.remove);
  const managerName = `E2E Moved Hub Manager ${RUN_ID}`;
  await signInWithEmail(context, superAdminEmail);
  await page.goto(getUrl(`/admin/hubs/${managerHub.id}/hub-managers`));
  const dialog = await fillHubManagerForm(page, managerName, `${EMAIL_PREFIX}-moved@example.com`);

  await db.update(hub).set({ projectId: otherProject.projectId }).where(eq(hub.id, managerHub.id));
  undo(() =>
    db.update(hub).set({ projectId: managerHub.projectId }).where(eq(hub.id, managerHub.id)),
  );
  await dialog.getByRole("button", { name: "Add hub manager" }).click();
  await expect(page.getByText("Hub not found").first()).toBeVisible();

  // A write that must not happen; the hub's page is not found now, so no page lists its managers.
  expect(await db.$count(hubCoordinator, eq(hubCoordinator.assignedHubId, managerHub.id))).toBe(0);
});
