import { expect, test } from "@playwright/test";
import { sql } from "drizzle-orm";

import { db } from "#/db/client";
import { signableMember, signInWithEmail } from "#/tests/helpers";
import { getUrl, searchRows } from "#/tests/pages/helpers";

/**
 * The fellows page of a hub coordinator does not send a fellow's ID number or M-Pesa number to the
 * browser. The edit dialog loads them when it opens. The database is used only to pick the fixture.
 */

test.describe.configure({ timeout: 3 * 60 * 1000 });

type Fixture = { fellowName: string; idNumber: string; mpesaNumber: string; email: string };
let fixture: Fixture;

test.beforeAll(async () => {
  const {
    rows: [row],
  } = await db.execute<Fixture>(sql`
    select f.fellow_name as "fellowName", f.id_number as "idNumber",
      f.mpesa_number as "mpesaNumber", u.email
    from hub_coordinators hc
    join implementer_members m on m.identifier = hc.id and m.role = 'HUB_COORDINATOR'
    join users u on u.id = m.user_id and u.email is not null
    join fellows f on f.hub_id = hc.assigned_hub_id and f.fellow_name is not null
      and length(f.id_number) >= 5 and length(f.mpesa_number) >= 5
    where ${signableMember()}
      and (select count(*) from fellows o where o.fellow_name = f.fellow_name) = 1
      -- The table shows phone numbers, and some seeded M-Pesa numbers equal one.
      and not exists (select 1 from fellows o
        where strpos(o.cell_number, f.id_number) > 0 or strpos(o.cell_number, f.mpesa_number) > 0)
    order by f.id
    limit 1`);
  if (!row) throw new Error("seed the database first: no fellow with an ID and M-Pesa number");
  fixture = row;
});

test("the fellows page HTML has no ID or M-Pesa number of a fellow", async ({ page, context }) => {
  await signInWithEmail(context, fixture.email);
  const response = await page.goto(getUrl("/hc/fellows"), { waitUntil: "networkidle" });
  const html = (await response?.text()) ?? "";

  expect(html).toContain(fixture.fellowName);
  expect(html).not.toContain(fixture.idNumber);
  expect(html).not.toContain(fixture.mpesaNumber);

  const fellowRow = await searchRows(page, fixture.fellowName);
  await fellowRow.getByRole("cell").last().click();
  await page.getByRole("menuitem", { name: "Edit fellow information" }).click();
  const dialog = page.getByRole("dialog", { name: "Edit fellow information" });
  await expect(dialog.locator('input[name="idNumber"]')).toHaveValue(fixture.idNumber);
  await expect(dialog.locator('input[name="mpesaNumber"]')).toHaveValue(fixture.mpesaNumber);
});
