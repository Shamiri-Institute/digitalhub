import { expect, type Page, test } from "@playwright/test";
import { eq, sql } from "drizzle-orm";

import { db } from "#/db/client";
import { fellow } from "#/db/schema";
import { signableMember, signInWithEmail, uniqueFellowName } from "#/tests/helpers";
import { getUrl, chooseRowAction, searchRows } from "#/tests/pages/helpers";

type Fixture = {
  fellowId: string;
  fellowName: string;
  mpesaName: string | null;
  subCounty: string | null;
  email: string;
};
let fixture: Fixture;

async function pickUniquelyNamedFellowInCoordinatorHub() {
  const {
    rows: [row],
  } = await db.execute<Fixture>(sql`
    select f.id as "fellowId", f.fellow_name as "fellowName", f.mpesa_name as "mpesaName",
      f.sub_county as "subCounty", u.email
    from hub_coordinators hc
    join implementer_members m on m.identifier = hc.id and m.role = 'HUB_COORDINATOR'
    join users u on u.id = m.user_id and u.email is not null
    join fellows f on f.hub_id = hc.assigned_hub_id and f.fellow_name is not null
      and f.fellow_email is not null
    where ${signableMember()}
      and ${uniqueFellowName()}
      and exists (select 1 from implementer_members fm where fm.identifier = f.id and fm.role = 'FELLOW')
    order by f.id
    limit 1`);
  if (!row) throw new Error("seed the database first: no editable fellow for a coordinator");
  return row;
}

test.beforeAll(async () => {
  const row = await pickUniquelyNamedFellowInCoordinatorHub();
  fixture = row;
});

test.afterAll(async () => {
  await db
    .update(fellow)
    .set({ mpesaName: fixture.mpesaName, subCounty: fixture.subCounty })
    .where(eq(fellow.id, fixture.fellowId));
});

async function openEditDialog(page: Page) {
  const fellowRow = await searchRows(page, fixture.fellowName);
  await chooseRowAction(page, fellowRow, "Edit fellow information");
  return page.getByRole("dialog", { name: "Edit fellow information" });
}

test("a hub coordinator edits a fellow of their hub", async ({ page, context }) => {
  await signInWithEmail(context, fixture.email);
  await page.goto(getUrl("/hc/fellows"));

  const dialog = await openEditDialog(page);
  const newMpesaName = `${fixture.fellowName} E2E`;
  await dialog.locator('input[name="mpesaName"]').fill(newMpesaName);
  // Seeded fellows can carry a sub-county outside their county, which the form rejects.
  await dialog.getByRole("combobox", { name: /Sub-county/ }).click();
  await page.getByRole("option").first().click();
  await dialog.getByRole("button", { name: "Update & Save" }).click();
  await expect(dialog).toBeHidden();

  await page.reload();
  const reopened = await openEditDialog(page);
  await expect(reopened.locator('input[name="mpesaName"]')).toHaveValue(newMpesaName);
});
