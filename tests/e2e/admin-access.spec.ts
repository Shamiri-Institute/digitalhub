import { and, eq, sql } from "drizzle-orm";

import { db } from "#/db/client";
import { plainAdminEmail, superAdminEmail } from "#/db/seed/fixtures";
import { adminUser, hub, implementerMember, session, user } from "#/db/schema";
import { loadSessionUser } from "#/lib/auth/session-user";
import { objectId } from "#/lib/crypto";
import { createProjectWithHub, createSuperAdminCopy } from "#/tests/access-helpers";
import { expect, test } from "#/tests/fixtures";
import { required, signInWithEmail } from "#/tests/helpers";
import { getUrl, searchRows } from "#/tests/pages/helpers";

/**
 * Super admins manage the admins of their implementer: they add an admin, set the admin's team and
 * super-admin access. They cannot remove their own super-admin access, so an implementer keeps a
 * super admin, and they see only the admins of their own implementer. Admins who are not super
 * admins have no Users tab and cannot open the page.
 */
const NEW_ADMIN_EMAIL = `e2e-admin-access-${Date.now()}@example.com`;
// A user whose email has capitals, as a sign-in provider can store it.
const MIXED_CASE_EMAIL = `E2E-Mixed-Case-${Date.now()}@Example.com`;

test.afterAll(async () => {
  const created = await db.query.adminUser.findMany({
    where: (a, { eq }) => eq(a.email, NEW_ADMIN_EMAIL),
    columns: { id: true },
  });
  for (const { id } of created) {
    await db.delete(implementerMember).where(eq(implementerMember.identifier, id));
    await db.delete(adminUser).where(eq(adminUser.id, id));
  }
  await db.delete(user).where(eq(user.email, NEW_ADMIN_EMAIL));

  const mixedCaseUsers = await db.query.user.findMany({
    where: (u, { eq }) => eq(u.email, MIXED_CASE_EMAIL),
    columns: { id: true },
  });
  for (const { id } of mixedCaseUsers) {
    await db.delete(implementerMember).where(eq(implementerMember.userId, id));
  }
  await db.delete(adminUser).where(eq(adminUser.email, MIXED_CASE_EMAIL.toLowerCase()));
  await db.delete(user).where(eq(user.email, MIXED_CASE_EMAIL));
});

test("a super admin adds an admin and changes their team", async ({ page, context }) => {
  await signInWithEmail(context, superAdminEmail);
  await page.goto(getUrl("/admin/schedule"));
  await page.getByRole("link", { name: "Users", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/users$/);
  await expect(page.getByRole("heading", { name: "User Management" })).toBeVisible();

  await page.getByRole("button", { name: "Add new user" }).click();
  const addDialog = page.getByRole("dialog");
  await addDialog.getByLabel("Full name").fill("E2E Access Admin");
  await addDialog.getByLabel("Email address").fill(NEW_ADMIN_EMAIL);
  await addDialog.getByRole("combobox").click();
  await page.getByRole("option", { name: "Care" }).click();
  await addDialog.getByRole("button", { name: "Save" }).click();
  await expect(addDialog).toBeHidden();

  await page.reload();
  let row = (await searchRows(page, NEW_ADMIN_EMAIL)).first();
  await expect(row).toBeVisible();
  await expect(row).toContainText("Care");
  await expect(row).toContainText("Admin");
  await expect(row).not.toContainText("Super admin");

  await row.locator('[aria-haspopup="menu"]').click();
  await page.getByRole("menuitem", { name: "Manage access" }).click();
  const editDialog = page.getByRole("dialog");
  await editDialog.getByRole("combobox").click();
  await page.getByRole("option", { name: "Research" }).click();
  await editDialog.getByRole("checkbox", { name: "Super admin" }).click();
  await editDialog.getByRole("button", { name: "Save" }).click();
  await expect(editDialog).toBeHidden();

  await page.reload();
  row = (await searchRows(page, NEW_ADMIN_EMAIL)).first();
  await expect(row).toContainText("Research");
  await expect(row).toContainText("Super admin");
});

test("an admin who is not a super admin has no Users tab and is redirected away", async ({
  page,
  context,
}) => {
  await signInWithEmail(context, plainAdminEmail);
  await page.goto(getUrl("/admin/schedule"));
  await expect(page.getByRole("link", { name: "Tickets" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Users", exact: true })).toHaveCount(0);

  await page.goto(getUrl("/admin/users"));
  await expect(page).toHaveURL(/\/admin\/schedule$/);
});

test("a super admin cannot remove their own super-admin access", async ({ page, context }) => {
  await signInWithEmail(context, superAdminEmail);
  await page.goto(getUrl("/admin/users"));

  await searchRows(page, superAdminEmail);
  const ownRow = () =>
    page
      .getByRole("row")
      .filter({ has: page.getByRole("cell", { name: superAdminEmail, exact: true }) });
  await expect(ownRow()).toContainText("Super admin");

  await ownRow().locator('[aria-haspopup="menu"]').click();
  await page.getByRole("menuitem", { name: "Manage access" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("checkbox", { name: "Super admin" }).click();
  await dialog.getByRole("button", { name: "Save" }).click();

  await expect(
    page.getByText("You cannot remove your own super admin access").first(),
  ).toBeVisible();
  await expect(dialog).toBeVisible();

  await page.reload();
  await searchRows(page, superAdminEmail);
  await expect(ownRow()).toContainText("Super admin");
});

test("the users table lists only the admins of the caller's implementer", async ({
  page,
  context,
}) => {
  const superAdmin = await db.query.user.findFirst({
    where: (u, { eq }) => eq(u.email, superAdminEmail),
    columns: { id: true },
  });
  const active = superAdmin ? (await loadSessionUser(superAdmin.id))?.activeMembership : undefined;
  if (!active) throw new Error(`${superAdminEmail} has no active membership; run npm run db:reset`);

  const otherImplementerAdmin = await db.query.adminUser.findFirst({
    where: (a, { and, ne }) =>
      and(ne(a.implementerId, active.implementerId), ne(a.email, superAdminEmail)),
    columns: { email: true },
  });
  if (!otherImplementerAdmin) throw new Error("Expected a seeded admin in a second implementer");

  await signInWithEmail(context, superAdminEmail);
  await page.goto(getUrl("/admin/users"));

  await expect((await searchRows(page, plainAdminEmail)).first()).toBeVisible();
  await expect(await searchRows(page, otherImplementerAdmin.email)).toHaveCount(0);
});

test("adding an admin reuses the user whose email only differs in case", async ({
  page,
  context,
}) => {
  const [existing] = await db
    .insert(user)
    .values({ email: MIXED_CASE_EMAIL, name: "E2E Mixed Case" })
    .returning({ id: user.id });
  if (!existing) throw new Error("Could not create the mixed-case user");

  await signInWithEmail(context, superAdminEmail);
  await page.goto(getUrl("/admin/users"));
  await page.getByRole("button", { name: "Add new user" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Full name").fill("E2E Mixed Case");
  await dialog.getByLabel("Email address").fill(MIXED_CASE_EMAIL);
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(dialog).toBeHidden();
  await page.reload();
  await expect((await searchRows(page, MIXED_CASE_EMAIL.toLowerCase())).first()).toBeVisible();

  // No second user was made: the ADMIN membership belongs to the existing one.
  expect(
    await db.$count(user, sql`lower(trim(${user.email})) = ${MIXED_CASE_EMAIL.toLowerCase()}`),
  ).toBe(1);
  const memberships = await db.query.implementerMember.findMany({
    where: (m, { eq }) => eq(m.userId, existing.id),
    columns: { role: true },
  });
  expect(memberships.map((m) => m.role)).toEqual(["ADMIN"]);
});

test("adding an admin of another implementer gives them a second profile and keeps their active implementer", async ({
  page,
  context,
  browser,
  undo,
}) => {
  const superAdmin = await db.query.user.findFirst({
    where: (u, { eq }) => eq(u.email, superAdminEmail),
    columns: { id: true },
  });
  const superAdminImplementerId = superAdmin
    ? (await loadSessionUser(superAdmin.id))?.activeMembership?.implementerId
    : undefined;
  required(superAdminImplementerId, `${superAdminEmail} with an active membership`);
  const {
    rows: [otherImplementer],
  } = await db.execute<{ id: string; implementerName: string }>(sql`
    select i.id, i.implementer_name as "implementerName"
    from implementers i where i.id <> ${superAdminImplementerId} order by i.id limit 1`);
  required(otherImplementer, "a second implementer");
  // A project of its own with a hub of each implementer, so both memberships are offered in it
  // and no seeded admin's active implementer changes.
  const sharedProject = await createProjectWithHub(superAdminImplementerId);
  undo(sharedProject.remove);
  const otherHubId = objectId("hub");
  await db.insert(hub).values({
    id: otherHubId,
    hubName: `E2E second implementer hub ${Date.now()}`,
    implementerId: otherImplementer.id,
    projectId: sharedProject.projectId,
  });
  undo(() => db.delete(hub).where(eq(hub.id, otherHubId)));

  const email = `e2e-two-implementers-${Date.now()}@example.com`;
  const [person] = await db
    .insert(user)
    .values({ email, name: "E2E Two Implementers", activeProjectId: sharedProject.projectId })
    .returning({ id: user.id });
  required(person, "the inserted user");
  const [firstProfile] = await db
    .insert(adminUser)
    .values({ email, adminName: "E2E Two Implementers", implementerId: otherImplementer.id })
    .returning({ id: adminUser.id });
  required(firstProfile, "the inserted admin profile");
  undo(async () => {
    await db.delete(session).where(eq(session.userId, person.id));
    await db.delete(implementerMember).where(eq(implementerMember.userId, person.id));
    await db.delete(adminUser).where(eq(adminUser.email, email));
    await db.delete(user).where(eq(user.id, person.id));
  });
  await db.insert(implementerMember).values({
    implementerId: otherImplementer.id,
    userId: person.id,
    role: "ADMIN",
    identifier: firstProfile.id,
  });
  // A copy of the super admin, so its implementer can be made plainly the newest without
  // touching the seeded account.
  const superAdminCopy = await createSuperAdminCopy();
  undo(superAdminCopy.remove);
  await db
    .update(user)
    .set({ activeProjectId: sharedProject.projectId })
    .where(eq(user.id, superAdminCopy.id));
  await db
    .update(implementerMember)
    .set({ updatedAt: new Date(Date.now() + 60_000) })
    .where(
      and(
        eq(implementerMember.userId, superAdminCopy.id),
        eq(implementerMember.implementerId, superAdminImplementerId),
      ),
    );

  await signInWithEmail(context, superAdminCopy.email);
  await page.goto(getUrl("/admin/users"));
  await page.getByRole("button", { name: "Add new user" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Full name").fill("E2E Two Implementers");
  await dialog.getByLabel("Email address").fill(email);
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(dialog).toBeHidden();
  await page.reload();
  await expect((await searchRows(page, email)).first()).toBeVisible();

  // No page lists a person's profiles across implementers.
  const profileImplementers = await db.query.adminUser.findMany({
    where: (a, { eq }) => eq(a.email, email),
    columns: { implementerId: true },
    orderBy: (a, { asc }) => asc(a.implementerId),
  });
  expect(profileImplementers.map((p) => p.implementerId)).toEqual(
    [otherImplementer.id, superAdminImplementerId].toSorted(),
  );

  const personContext = await browser.newContext();
  await signInWithEmail(personContext, email);
  const personPage = await personContext.newPage();
  await personPage.goto(getUrl("/admin/hubs"));
  await expect(
    personPage
      .getByRole("button")
      .filter({ hasText: otherImplementer.implementerName, visible: true })
      .first(),
  ).toBeVisible();
  await personContext.close();
});
