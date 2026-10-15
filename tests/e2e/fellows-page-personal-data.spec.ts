import { expect, type Page, test } from "@playwright/test";
import { type SQL, sql } from "drizzle-orm";

import { db } from "#/db/client";
import { signableMember, signInWithEmail, uniqueFellowName, required } from "#/tests/helpers";
import { getUrl, searchRows } from "#/tests/pages/helpers";

type Fixture = {
  fellowName: string;
  idNumber: string;
  mpesaNumber: string;
  email: string;
  schoolVisibleId: string;
};

/** A fellow with an ID and M-Pesa number that no other value on the page can contain. */
async function pickFixture(from: SQL) {
  const {
    rows: [row],
  } = await db.execute<Fixture>(sql`
    select f.fellow_name as "fellowName", f.id_number as "idNumber",
      f.mpesa_number as "mpesaNumber", u.email, s.visible_id as "schoolVisibleId"
    ${from}
    join users u on u.id = m.user_id
    where ${signableMember()}
      and f.fellow_name is not null and length(f.id_number) >= 5 and length(f.mpesa_number) >= 5
      and ${uniqueFellowName()}
      -- The tables show phone numbers, and a random ID number can appear inside one.
      and not exists (select 1 from fellows o where strpos(o.cell_number, f.id_number) > 0)
    order by f.id
    limit 1`);
  required(row, "no fellow with an ID and M-Pesa number");
  return row;
}

async function expectNoPersonalData(
  page: Page,
  path: string,
  fixture: Fixture,
  { showsMpesaNumber = false } = {},
) {
  const response = await page.goto(getUrl(path), { waitUntil: "networkidle" });
  const html = (await response?.text()) ?? "";
  expect(html).toContain(fixture.fellowName);
  expect(html).not.toContain(fixture.idNumber);
  if (!showsMpesaNumber) {
    expect(html).not.toContain(fixture.mpesaNumber);
  }
}

async function expectDialogShowsPersonalData(page: Page, fixture: Fixture, item: string) {
  const fellowRow = await searchRows(page, fixture.fellowName);
  await fellowRow.locator('[aria-haspopup="menu"]').last().click();
  await page.getByRole("menuitem", { name: item }).click();
  const dialog = page.getByRole("dialog", { name: item });
  await expect(dialog.locator('input[name="idNumber"]')).toHaveValue(fixture.idNumber);
  await expect(dialog.locator('input[name="mpesaNumber"]')).toHaveValue(fixture.mpesaNumber);
  if (item.startsWith("View")) {
    await expect(dialog.getByRole("textbox", { name: "Date of birth" })).toBeVisible();
  }
}

const hubCoordinatorFellow = sql`
  from hub_coordinators hc
  join implementer_members m on m.identifier = hc.id and m.role = 'HUB_COORDINATOR'
  join fellows f on f.hub_id = hc.assigned_hub_id
  join schools s on s.id = (select id from schools where hub_id = hc.assigned_hub_id
    and archived_at is null order by visible_id limit 1)`;

const supervisedFellow = sql`
  from supervisors sv
  join implementer_members m on m.identifier = sv.id and m.role = 'SUPERVISOR'
  join fellows f on f.supervisor_id = sv.id and f.hub_id = sv.hub_id
  join schools s on s.id = (select id from schools where hub_id = sv.hub_id
    and archived_at is null order by visible_id limit 1)`;

test("the hub coordinator fellows page HTML has no ID or M-Pesa number of a fellow", async ({
  page,
  context,
}) => {
  const fixture = await pickFixture(hubCoordinatorFellow);
  await signInWithEmail(context, fixture.email);
  await expectNoPersonalData(page, "/hc/fellows", fixture);
  await expectDialogShowsPersonalData(page, fixture, "Edit fellow information");
});

test("the supervisor fellows page HTML has no ID number of a fellow", async ({ page, context }) => {
  const fixture = await pickFixture(supervisedFellow);
  await signInWithEmail(context, fixture.email);
  await expectNoPersonalData(page, "/sc/fellows", fixture, { showsMpesaNumber: true });
  await expectDialogShowsPersonalData(page, fixture, "Edit fellow information");
});

test("the school fellows tab HTML has no ID or M-Pesa number of a fellow", async ({
  page,
  context,
}) => {
  const fixture = await pickFixture(hubCoordinatorFellow);
  await signInWithEmail(context, fixture.email);
  await expectNoPersonalData(page, `/hc/schools/${fixture.schoolVisibleId}/fellows`, fixture);
  await expectDialogShowsPersonalData(page, fixture, "View fellow information");
});

test("the supervisor school fellows tab HTML has no ID or M-Pesa number of a fellow", async ({
  page,
  context,
}) => {
  const fixture = await pickFixture(supervisedFellow);
  await signInWithEmail(context, fixture.email);
  await expectNoPersonalData(page, `/sc/schools/${fixture.schoolVisibleId}/fellows`, fixture);
  await expectDialogShowsPersonalData(page, fixture, "Edit fellow information");
});

test("the fellow portal HTML has no ID or M-Pesa number of the fellow's supervisor", async ({
  page,
  context,
}) => {
  const {
    rows: [fixture],
  } = await db.execute<{ email: string; idNumber: string; mpesaNumber: string }>(sql`
    select u.email, sv.id_number as "idNumber", sv.mpesa_number as "mpesaNumber"
    from fellows f
    join implementer_members m on m.identifier = f.id and m.role = 'FELLOW'
    join users u on u.id = m.user_id
    join supervisors sv on sv.id = f.supervisor_id
    where ${signableMember()} and length(sv.id_number) >= 5 and length(sv.mpesa_number) >= 5
      and not exists (select 1 from fellows o where strpos(o.cell_number, sv.id_number) > 0)
    order by f.id
    limit 1`);
  required(fixture, "no fellow with a supervisor");
  await signInWithEmail(context, fixture.email);
  const response = await page.goto(getUrl("/fel/portal"), { waitUntil: "networkidle" });
  const html = (await response?.text()) ?? "";
  expect(html).not.toContain(fixture.idNumber);
  expect(html).not.toContain(fixture.mpesaNumber);
});
