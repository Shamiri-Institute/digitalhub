import { expect, test } from "@playwright/test";
import { eq } from "drizzle-orm";

import { db } from "#/db/client";
import { adminUser, implementerMember, user } from "#/db/schema";
import { signInWithEmail } from "#/tests/helpers";
import { getUrl, searchRows } from "#/tests/pages/helpers";

/**
 * Super admins manage the admins of their implementer: they add an admin, set the admin's team and
 * super-admin access. Admins who are not super admins have no Users tab and cannot open the page.
 * The seed makes admin@shamiri.institute a super admin and plain.admin@shamiri.institute a plain
 * admin (db/seed/seed.ts).
 */
const SUPER_ADMIN = "admin@shamiri.institute";
const PLAIN_ADMIN = "plain.admin@shamiri.institute";
const NEW_ADMIN_EMAIL = `e2e-admin-access-${Date.now()}@example.com`;

// The dev server compiles each page on first use, which can take longer than the default.
test.describe.configure({ timeout: 3 * 60 * 1000 });

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
});

test("a super admin adds an admin and changes their team", async ({ page, context }) => {
  await signInWithEmail(context, SUPER_ADMIN);
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
  await signInWithEmail(context, PLAIN_ADMIN);
  await page.goto(getUrl("/admin/schedule"));
  await expect(page.getByRole("link", { name: "Tickets" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Users", exact: true })).toHaveCount(0);

  await page.goto(getUrl("/admin/users"));
  await expect(page).toHaveURL(/\/admin\/schedule$/);
});
