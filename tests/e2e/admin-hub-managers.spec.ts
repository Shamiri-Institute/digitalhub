import { type BrowserContext, expect, type Page, test } from "@playwright/test";
import { inArray, like, sql } from "drizzle-orm";

import { db } from "#/db/client";
import { plainAdminEmail, superAdminEmail } from "#/db/seed/fixtures";
import { hub, hubCoordinator, implementerMember, user } from "#/db/schema";
import { objectId } from "#/lib/crypto";
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
    .returning({ id: hub.id, implementerId: hub.implementerId });
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
    // The 47 counties scroll inside the list instead of running off the screen.
    const countyList = await page.getByRole("listbox").boundingBox();
    const viewport = page.viewportSize();
    if (!countyList || !viewport) throw new Error("The county list is not on screen");
    expect(countyList.y + countyList.height).toBeLessThanOrEqual(viewport.height);
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
  await expect(archiveDialog.getByRole("button", { name: "Cancel" })).toBeFocused();
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
