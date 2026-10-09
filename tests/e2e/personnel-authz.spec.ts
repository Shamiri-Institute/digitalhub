import { expect, test } from "@playwright/test";
import { sql } from "drizzle-orm";

import { db } from "#/db/client";
import { signInWithEmail } from "#/tests/helpers";

/**
 * The development-only RoleSwitcher lists the people of the caller's own organisation. The
 * layout loads the list from the session, so no request can ask for another organisation's roster.
 */

const FELLOW_EMAIL = "bukayo.saka@test.com";

async function loadFixture() {
  const {
    rows: [fixture],
  } = await db.execute<{ ownName: string; otherOrgName: string }>(sql`
    with own as (
      select m.implementer_id from implementer_members m
      join users u on u.id = m.user_id
      where u.email = ${FELLOW_EMAIL} and m.role = 'FELLOW'
      limit 1
    )
    select
      (select f.fellow_name from fellows f
        join implementer_members m on m.identifier = f.id and m.role = 'FELLOW'
        where m.implementer_id = (select implementer_id from own) and f.fellow_email <> ${FELLOW_EMAIL}
        order by f.fellow_name limit 1) as "ownName",
      (select f.fellow_name from fellows f
        join implementer_members m on m.identifier = f.id and m.role = 'FELLOW'
        where m.implementer_id <> (select implementer_id from own)
        order by f.fellow_name limit 1) as "otherOrgName"`);
  if (!fixture?.ownName || !fixture.otherOrgName) {
    throw new Error("Need fellows in the caller's organisation and in another organisation");
  }
  return fixture;
}

test("the role switcher lists only the caller's own organisation", async ({ page, context }) => {
  const { ownName, otherOrgName } = await loadFixture();
  await signInWithEmail(context, FELLOW_EMAIL);
  await page.goto("/fel/schools");

  await page.getByRole("button").filter({ hasText: "FELLOW", visible: true }).first().click();
  const search = page.getByPlaceholder(/^Search \d+ members\.\.\.$/);

  await search.fill(ownName);
  await expect(page.getByRole("option").filter({ hasText: ownName }).first()).toBeVisible();

  await search.fill(otherOrgName);
  await expect(page.getByText("No members found.")).toBeVisible();
});
