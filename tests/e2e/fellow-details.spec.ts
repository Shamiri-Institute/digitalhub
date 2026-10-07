import { expect, test } from "@playwright/test";
import { eq, sql } from "drizzle-orm";

import { db } from "#/db/client";
import { fellow } from "#/db/schema";
import { signableMember, signInWithEmail } from "#/tests/helpers";
import { getUrl, searchRows } from "#/tests/pages/helpers";

/**
 * A hub coordinator edits a fellow of their hub. The edit action scopes the fellow to the caller,
 * so this guards the allowed path. The database is used to pick the fixture, to read the stored
 * value back and to restore it.
 */

// The dev server compiles each page on first use, which can take longer than the default.
test.describe.configure({ timeout: 3 * 60 * 1000 });

type Fixture = {
  fellowId: string;
  fellowName: string;
  mpesaName: string | null;
  subCounty: string | null;
  email: string;
};
let fixture: Fixture;

test.beforeAll(async () => {
  // A fellow with a unique name in the hub of a coordinator who can sign in.
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
      and (select count(*) from fellows o where o.fellow_name = f.fellow_name) = 1
      and exists (select 1 from implementer_members fm where fm.identifier = f.id and fm.role = 'FELLOW')
    order by f.id
    limit 1`);
  if (!row) throw new Error("seed the database first: no editable fellow for a coordinator");
  fixture = row;
});

test.afterAll(async () => {
  await db
    .update(fellow)
    .set({ mpesaName: fixture.mpesaName, subCounty: fixture.subCounty })
    .where(eq(fellow.id, fixture.fellowId));
});

test("a hub coordinator edits a fellow of their hub", async ({ page, context }) => {
  await signInWithEmail(context, fixture.email);
  await page.goto(getUrl("/hc/fellows"), { waitUntil: "networkidle" });

  const fellowRow = await searchRows(page, fixture.fellowName);
  await fellowRow.getByRole("cell").last().click();
  await page.getByRole("menuitem", { name: "Edit fellow information" }).click();
  const dialog = page.getByRole("dialog", { name: "Edit fellow information" });
  const newMpesaName = `${fixture.fellowName} E2E`;
  await dialog.locator('input[name="mpesaName"]').fill(newMpesaName);
  // Seeded fellows can carry a sub-county outside their county, which the form rejects.
  await dialog.getByRole("combobox", { name: /Sub-county/ }).click();
  await page.getByRole("option").first().click();
  await dialog.getByRole("button", { name: "Update & Save" }).click();
  await expect(dialog).toBeHidden();

  const [stored] = await db
    .select({ mpesaName: fellow.mpesaName })
    .from(fellow)
    .where(eq(fellow.id, fixture.fellowId));
  expect(stored?.mpesaName).toBe(newMpesaName);
});
