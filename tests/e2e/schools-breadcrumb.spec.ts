import { expect, test } from "@playwright/test";
import { sql } from "drizzle-orm";

import { db } from "#/db/client";
import { signableMember, signInWithEmail, required } from "#/tests/helpers";
import { getUrl } from "#/tests/pages/helpers";

type Fixture = {
  email: string;
  implementerId: string;
  visibleId: string;
  schoolName: string;
  hubName: string;
};

test("the school breadcrumb names the hub and switches between the implementer's schools", async ({
  page,
  context,
}) => {
  const {
    rows: [fixture],
  } = await db.execute<Fixture>(sql`
    select u.email, m.implementer_id as "implementerId", s.visible_id as "visibleId", s.school_name as "schoolName", h.hub_name as "hubName"
    from implementer_members m
    join users u on u.id = m.user_id
    join hubs h on h.implementer_id = m.implementer_id
    join projects p on p.id = h.project_id and p.is_default
    join schools s on s.hub_id = h.id
    where m.role = 'ADMIN' and ${signableMember()}
    order by u.email, s.visible_id
    limit 1`);
  required(fixture, "no admin with a school");
  const { rows: implementerSchools } = await db.execute<{ schoolName: string }>(sql`
    select s.school_name as "schoolName"
    from schools s
    join hubs h on h.id = s.hub_id
    join projects p on p.id = h.project_id and p.is_default
    where h.implementer_id = ${fixture.implementerId}`);

  const schoolUrl = getUrl(`/admin/schools/${fixture.visibleId}/sessions`);
  await signInWithEmail(context, fixture.email);

  await page.goto(schoolUrl);
  await expect(page.getByText(`Hubs/${fixture.hubName}/${fixture.schoolName}`)).toBeVisible();
  await page.locator("div[aria-haspopup=dialog]", { hasText: fixture.schoolName }).click();
  const options = page.getByRole("option");
  await expect(options).toHaveCount(implementerSchools.length);
  // Each option shows the school, then its hub on a second line.
  const optionSchools = (await options.allInnerTexts()).map((text) => text.split("\n")[0] ?? "");
  const byName = (a: string, b: string) => a.localeCompare(b);
  expect(optionSchools.toSorted(byName)).toEqual(
    implementerSchools.map((s) => s.schoolName).toSorted(byName),
  );
});
