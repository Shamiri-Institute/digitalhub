import { expect, test } from "@playwright/test";
import { sql } from "drizzle-orm";

import { db } from "#/db/client";
import { signableMember, signInWithEmail } from "#/tests/helpers";
import { getUrl } from "#/tests/pages/helpers";

/**
 * The school switcher in the breadcrumb comes in the first HTML response, not from a request after
 * hydration. An admin sees every school of the implementer in the default project.
 */

type Fixture = {
  email: string;
  implementerId: string;
  visibleId: string;
  schoolName: string;
  hubName: string;
};

test("the school breadcrumb and its switcher render on the server", async ({ page, context }) => {
  test.setTimeout(3 * 60 * 1000);
  const {
    rows: [fixture],
  } = await db.execute<Fixture>(sql`
    select u.email, m.implementer_id as "implementerId", s.visible_id as "visibleId", s.school_name as "schoolName", h.hub_name as "hubName"
    from implementer_members m
    join users u on u.id = m.user_id and u.email is not null
    join hubs h on h.implementer_id = m.implementer_id
    join projects p on p.id = h.project_id and p.is_default
    join schools s on s.hub_id = h.id
    where m.role = 'ADMIN' and ${signableMember()}
    order by u.email, s.visible_id
    limit 1`);
  if (!fixture) throw new Error("seed the database first: no admin with a school");
  const { rows: implementerSchools } = await db.execute<{ schoolName: string }>(sql`
    select s.school_name as "schoolName"
    from schools s
    join hubs h on h.id = s.hub_id
    join projects p on p.id = h.project_id and p.is_default
    where h.implementer_id = ${fixture.implementerId}`);

  const schoolUrl = getUrl(`/admin/schools/${fixture.visibleId}/sessions`);
  await signInWithEmail(context, fixture.email);

  const html = await (await context.request.get(schoolUrl)).text();
  const breadcrumbText = html.replace(/<[^>]+>/g, "").match(/Hubs\/[^/]*\/.{0,80}/)?.[0];
  expect(breadcrumbText).toContain(`Hubs/${fixture.hubName}/${fixture.schoolName}`);
  for (const { schoolName } of implementerSchools) {
    expect(html.includes(schoolName), `${schoolName} is not in the HTML`).toBe(true);
  }

  await page.goto(schoolUrl);
  await page.locator("div[aria-haspopup=dialog]", { hasText: fixture.schoolName }).click();
  await expect(page.getByRole("option")).toHaveCount(implementerSchools.length);
});
