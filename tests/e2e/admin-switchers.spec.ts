import { expect, type Page, test } from "@playwright/test";
import { eq, sql } from "drizzle-orm";

import { db } from "#/db/client";
import { adminUser, implementerMember, session, user } from "#/db/schema";
import { signInWithEmail } from "#/tests/helpers";
import { getUrl } from "#/tests/pages/helpers";

/**
 * The project and implementer switchers in the admin header. Both read the session from the server
 * layout, so after a switch the header must show the new project and implementer.
 */

test.describe.configure({ mode: "serial" });

type Admin = { userId: string; email: string; activeProjectId: string; activeProjectName: string };
type Project = { id: string; name: string; implementerName: string | null };

async function loadFixture() {
  const {
    rows: [seededAdmin],
  } = await db.execute<Admin>(sql`
    select u.id as "userId", u.email, p.id as "activeProjectId", p.name as "activeProjectName"
    from users u
    join projects p on p.id = coalesce(u.active_project_id, (select id from projects where is_default))
    join implementer_members m on m.user_id = u.id and m.role = 'ADMIN'
    join hubs h on h.implementer_id = m.implementer_id
    where u.archived_at is null and u.email is not null
    group by u.id, p.id
    having count(distinct m.id) > 1 and count(distinct h.project_id) > 1
    order by u.email
    limit 1`);
  if (!seededAdmin) throw new Error("No admin with memberships in two projects");
  const admin = await copyAdmin(seededAdmin);
  const { rows: otherProjects } = await db.execute<Project>(sql`
    select p.id, p.name, (
      select i.implementer_name from implementer_members m
      join implementers i on i.id = m.implementer_id
      where m.user_id = ${admin.userId} and m.role = 'ADMIN'
        and exists (select 1 from hubs h where h.implementer_id = m.implementer_id and h.project_id = p.id)
      order by i.implementer_name
      limit 1
    ) as "implementerName"
    from projects p
    where p.id <> ${admin.activeProjectId}
    order by p.name`);
  return { admin, otherProjects };
}

function header(page: Page, role: "button" | "option", text: string) {
  return page.getByRole(role).filter({ hasText: text, visible: true }).first();
}

async function switchProject(page: Page, from: string, to: string) {
  await header(page, "button", from).click();
  await header(page, "option", to).click();
  await expect(header(page, "button", to)).toBeVisible();
}

let copies: { userId: string; email: string }[] = [];
test.afterEach(async () => {
  for (const { userId, email } of copies) {
    await db.delete(implementerMember).where(eq(implementerMember.userId, userId));
    await db.delete(session).where(eq(session.userId, userId));
    await db.delete(adminUser).where(eq(adminUser.email, email));
    await db.delete(user).where(eq(user.id, userId));
  }
  copies = [];
});

/**
 * A new user with an admin profile in each of the seeded admin's implementers, so switching its
 * project or implementer changes no user another spec signs in as.
 */
async function copyAdmin(seededAdmin: Admin): Promise<Admin> {
  const email = `e2e-switcher-${Date.now()}@example.com`;
  const [copy] = await db
    .insert(user)
    .values({ email, name: "E2E Switcher", activeProjectId: seededAdmin.activeProjectId })
    .returning({ id: user.id });
  if (!copy) throw new Error("Could not create the admin copy");
  copies.push({ userId: copy.id, email });
  const memberships = await db.query.implementerMember.findMany({
    where: (m, { and, eq }) => and(eq(m.userId, seededAdmin.userId), eq(m.role, "ADMIN")),
    columns: { implementerId: true },
  });
  for (const { implementerId } of memberships) {
    const [profile] = await db
      .insert(adminUser)
      .values({ email, adminName: "E2E Switcher", implementerId })
      .returning({ id: adminUser.id });
    if (!profile) throw new Error("Could not create an admin profile");
    await db
      .insert(implementerMember)
      .values({ implementerId, userId: copy.id, role: "ADMIN", identifier: profile.id });
  }
  return { ...seededAdmin, userId: copy.id, email };
}

test("switching project shows the new project and its implementer in the header", async ({
  page,
  context,
}) => {
  const { admin, otherProjects } = await loadFixture();
  const target = otherProjects.find((p) => p.implementerName);
  if (!target?.implementerName) throw new Error("No other project with one of the admin's hubs");
  await signInWithEmail(context, admin.email);

  await page.goto(getUrl("/admin/hubs"));
  await switchProject(page, admin.activeProjectName, target.name);
  await expect(header(page, "button", target.implementerName)).toBeVisible();

  await page.reload();
  await expect(header(page, "button", target.name)).toBeVisible();
  await expect(header(page, "button", target.implementerName)).toBeVisible();
});

test("the project switcher lists only the projects of the admin's implementers", async ({
  page,
  context,
}) => {
  const { admin, otherProjects } = await loadFixture();
  const foreign = otherProjects.find((p) => !p.implementerName);
  if (!foreign) throw new Error("No project without the admin's hubs");
  await signInWithEmail(context, admin.email);

  await page.goto(getUrl("/admin/hubs"));
  await header(page, "button", admin.activeProjectName).click();
  for (const own of otherProjects.filter((p) => p.implementerName)) {
    await expect(header(page, "option", own.name)).toBeVisible();
  }
  await expect(page.getByRole("option", { name: foreign.name, exact: true })).toHaveCount(0);
});
