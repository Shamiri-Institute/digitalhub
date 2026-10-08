import { expect, test } from "@playwright/test";
import { type SQL, sql } from "drizzle-orm";

import { db } from "#/db/client";
import { signableMember, signInWithEmail } from "#/tests/helpers";
import { getUrl } from "#/tests/pages/helpers";

/**
 * Each school tab opens for a school in the caller's hubs and shows the not-found page for a
 * school outside them. Admins see the hubs of their organisation, fellows the schools where they
 * lead a group.
 */

test.describe.configure({ timeout: 4 * 60 * 1000 });

const notFoundText = "This page could not be found.";

type Fixture = { email: string; ownSchool: string; otherSchool: string };

const callers: { role: string; base: string; tabs: string[]; fixture: SQL }[] = [
  {
    role: "HUB_COORDINATOR",
    base: "/hc/schools",
    tabs: ["sessions", "supervisors", "fellows", "students", "groups"],
    fixture: sql`
      select u.email,
        (select s.visible_id from schools s where s.hub_id = hc.assigned_hub_id
          order by s.visible_id limit 1) as "ownSchool",
        (select s.visible_id from schools s join hubs h on h.id = s.hub_id
          where s.hub_id <> hc.assigned_hub_id and h.implementer_id = m.implementer_id
          order by s.visible_id limit 1) as "otherSchool"
      from hub_coordinators hc
      join implementer_members m on m.identifier = hc.id and m.role = 'HUB_COORDINATOR'
      join users u on u.id = m.user_id and u.email is not null
      where ${signableMember()}
      order by u.email`,
  },
  {
    role: "SUPERVISOR",
    base: "/sc/schools",
    tabs: ["sessions", "fellows", "students", "groups"],
    fixture: sql`
      select u.email,
        (select s.visible_id from schools s where s.hub_id = sv.hub_id
          order by s.visible_id limit 1) as "ownSchool",
        (select s.visible_id from schools s join hubs h on h.id = s.hub_id
          where s.hub_id <> sv.hub_id and h.implementer_id = m.implementer_id
          order by s.visible_id limit 1) as "otherSchool"
      from supervisors sv
      join implementer_members m on m.identifier = sv.id and m.role = 'SUPERVISOR'
      join users u on u.id = m.user_id and u.email is not null
      where ${signableMember()}
      order by u.email`,
  },
  {
    role: "ADMIN",
    base: "/admin/schools",
    tabs: ["sessions", "supervisors", "fellows", "students", "groups"],
    fixture: sql`
      select u.email,
        (select s.visible_id from schools s join hubs h on h.id = s.hub_id
          join projects p on p.id = h.project_id and p.is_default
          where h.implementer_id = m.implementer_id
          order by s.visible_id limit 1) as "ownSchool",
        (select s.visible_id from schools s join hubs h on h.id = s.hub_id
          where h.implementer_id <> m.implementer_id
          order by s.visible_id limit 1) as "otherSchool"
      from implementer_members m
      join users u on u.id = m.user_id and u.email is not null
      where m.role = 'ADMIN' and ${signableMember()}
      order by u.email`,
  },
  {
    role: "FELLOW",
    base: "/fel/schools",
    tabs: ["sessions"],
    fixture: sql`
      select u.email,
        (select s.visible_id from schools s join intervention_groups g on g.school_id = s.id
          where g.leader_id = f.id order by s.visible_id limit 1) as "ownSchool",
        (select s.visible_id from schools s
          where not exists (select 1 from intervention_groups g
            where g.school_id = s.id and g.leader_id = f.id)
          order by s.visible_id limit 1) as "otherSchool"
      from fellows f
      join implementer_members m on m.identifier = f.id and m.role = 'FELLOW'
      join users u on u.id = m.user_id and u.email is not null
      where ${signableMember()}
      order by u.email`,
  },
];

for (const caller of callers) {
  test(`school pages show only the ${caller.role} caller's schools`, async ({ page, context }) => {
    const { rows } = await db.execute<Fixture>(caller.fixture);
    const fixture = rows.find((row) => row.ownSchool && row.otherSchool);
    if (!fixture) throw new Error(`seed the database first: no ${caller.role} fixture`);

    await signInWithEmail(context, fixture.email);
    for (const tab of caller.tabs) {
      await page.goto(getUrl(`${caller.base}/${fixture.ownSchool}/${tab}`));
      await expect(page.getByRole("table").first(), `own school ${tab}`).toBeVisible({
        timeout: 60_000,
      });
      await expect(page.getByText(notFoundText)).toHaveCount(0);

      await page.goto(getUrl(`${caller.base}/${fixture.otherSchool}/${tab}`));
      await expect(page.getByText(notFoundText), `other school ${tab}`).toBeVisible({
        timeout: 60_000,
      });
    }
  });
}
