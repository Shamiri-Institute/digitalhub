import { expect, type Page, test } from "@playwright/test";
import { sql } from "drizzle-orm";

import { db } from "#/db/client";
import { signInWithEmail } from "#/tests/helpers";
import { getUrl } from "#/tests/pages/helpers";

/**
 * The project and implementer switchers in the admin header. Both read the session from the server
 * layout, so after a switch the header must show the new project and implementer.
 */

test.describe.configure({ mode: "serial", timeout: 3 * 60 * 1000 });

type Admin = { userId: string; email: string; activeProjectId: string; activeProjectName: string };
type Project = { id: string; name: string; implementerName: string | null };

async function loadFixture() {
  const {
    rows: [admin],
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
  if (!admin) throw new Error("No admin with memberships in two projects");
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

let restore: (() => Promise<unknown>)[] = [];
test.afterEach(async () => {
  for (const step of restore.reverse()) await step();
  restore = [];
});

async function rememberAdminState(admin: Admin) {
  const { rows: memberships } = await db.execute<{ id: number; updatedAt: string | null }>(
    sql`select id, updated_at::text as "updatedAt" from implementer_members where user_id = ${admin.userId}`,
  );
  restore.push(async () => {
    await db.execute(
      sql`update users set active_project_id = ${admin.activeProjectId} where id = ${admin.userId}`,
    );
    for (const m of memberships) {
      await db.execute(
        sql`update implementer_members set updated_at = ${m.updatedAt}::timestamp where id = ${m.id}`,
      );
    }
  });
}

test("switching project shows the new project and its implementer in the header", async ({
  page,
  context,
}) => {
  const { admin, otherProjects } = await loadFixture();
  const target = otherProjects.find((p) => p.implementerName);
  if (!target?.implementerName) throw new Error("No other project with one of the admin's hubs");
  await rememberAdminState(admin);
  await signInWithEmail(context, admin.email);

  await page.goto(getUrl("/admin/hubs"));
  await switchProject(page, admin.activeProjectName, target.name);
  await expect(header(page, "button", target.implementerName)).toBeVisible();

  await page.reload();
  await expect(header(page, "button", target.name)).toBeVisible();
  await expect(header(page, "button", target.implementerName)).toBeVisible();
});

test("switching implementer shows the new implementer in the header", async ({ page, context }) => {
  const { admin, otherProjects } = await loadFixture();
  // In a project with none of the admin's hubs, every admin membership is listed.
  const target = otherProjects.find((p) => !p.implementerName);
  if (!target) throw new Error("No project without the admin's hubs");
  const { rows: implementers } = await db.execute<{ name: string }>(sql`
    select i.implementer_name as name from implementer_members m
    join implementers i on i.id = m.implementer_id
    where m.user_id = ${admin.userId} and m.role = 'ADMIN'
    order by i.implementer_name`);
  await rememberAdminState(admin);
  await signInWithEmail(context, admin.email);

  await page.goto(getUrl("/admin/hubs"));
  await switchProject(page, admin.activeProjectName, target.name);

  let from: string | undefined;
  for (const { name } of implementers) {
    if (await header(page, "button", name).isVisible()) from = name;
  }
  const to = implementers.find((i) => i.name !== from)?.name;
  if (!from || !to) throw new Error("The admin needs two implementers");

  await header(page, "button", from).click();
  await header(page, "option", to).click();
  await expect(header(page, "button", to)).toBeVisible({ timeout: 30_000 });
  await page.reload();
  await expect(header(page, "button", to)).toBeVisible();
});
