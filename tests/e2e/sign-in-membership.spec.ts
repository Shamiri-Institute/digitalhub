import { and, eq } from "drizzle-orm";

import { db } from "#/db/client";
import { plainAdminEmail } from "#/db/seed/fixtures";
import { implementerMember, session } from "#/db/schema";
import { expect, test } from "#/tests/fixtures";
import { createAdminCopy, required, signInAs, signInWithEmail } from "#/tests/helpers";
import { getUrl } from "#/tests/pages/helpers";
import { pickUser } from "#/tests/platform-routes";

const loginUrl = new RegExp(`^${getUrl("/login")}`);

async function plainAdminCopy() {
  const seeded = await db.query.user.findFirst({
    where: (u, { eq }) => eq(u.email, plainAdminEmail),
    columns: { id: true },
  });
  required(seeded, `the user ${plainAdminEmail}`);
  return createAdminCopy(seeded.id);
}

test("the membership updated last is the user's active role", async ({ page, context, undo }) => {
  const admin = await plainAdminCopy();
  undo(admin.remove);
  const coordinator = await pickUser("HUB_COORDINATOR");
  const coordinatorMembership = await db.query.implementerMember.findFirst({
    where: (m, { eq }) => eq(m.userId, coordinator.id),
    columns: { implementerId: true, identifier: true },
  });
  required(coordinatorMembership, "the seeded hub coordinator's membership");
  const inOneMinute = new Date(Date.now() + 60_000);
  await db.insert(implementerMember).values({
    ...coordinatorMembership,
    userId: admin.id,
    role: "HUB_COORDINATOR",
    updatedAt: inOneMinute,
  });

  await signInWithEmail(context, admin.email);
  await page.goto(getUrl("/"));
  await expect(page).toHaveURL(getUrl("/hc/schedule"));

  await db
    .update(implementerMember)
    .set({ updatedAt: new Date(inOneMinute.getTime() + 60_000) })
    .where(and(eq(implementerMember.role, "ADMIN"), eq(implementerMember.userId, admin.id)));
  await page.goto(getUrl("/"));
  await expect(page).toHaveURL(getUrl("/admin/schedule"));
});

test("removing a user's membership signs them out on their next request", async ({
  page,
  context,
  undo,
}) => {
  const admin = await plainAdminCopy();
  undo(admin.remove);
  await signInWithEmail(context, admin.email);
  await page.goto(getUrl("/admin/schedule"));
  await expect(page).toHaveURL(getUrl("/admin/schedule"));

  await db.delete(implementerMember).where(eq(implementerMember.userId, admin.id));
  await page.goto(getUrl("/admin/schedule"));
  await expect(page).toHaveURL(loginUrl);
  // The browser drops its cookie either way; only the database shows the session was revoked.
  expect(await db.$count(session, eq(session.userId, admin.id))).toBe(0);
});

test("outside development nobody can switch to another person's role", async ({
  page,
  context,
}) => {
  await signInAs(context, "HUB_COORDINATOR");
  await page.goto(getUrl("/hc/schedule"));
  await expect(page.getByRole("navigation", { name: "Main" })).toBeVisible();
  await expect(page.getByRole("button").filter({ hasText: "HUB COORDINATOR" })).toHaveCount(0);
});
