import { expect, test } from "@playwright/test";
import { eq, sql } from "drizzle-orm";

import { db } from "#/db/client";
import { plainAdminEmail, superAdminEmail } from "#/db/seed/fixtures";
import { adminUser, implementerMember, user } from "#/db/schema";
import { loadSessionUser } from "#/lib/auth/session-user";
import { signInWithEmail } from "#/tests/helpers";
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
