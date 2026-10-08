import { expect, test } from "@playwright/test";
import { sql } from "drizzle-orm";

import { db } from "#/db/client";
import { emailForProfile, signInWithEmail } from "#/tests/helpers";
import { getUrl, searchRows } from "#/tests/pages/helpers";

/**
 * A hub coordinator opens the fellow expenses report. The row of one fellow shows the session
 * counts and payout totals that a direct query of the database gives, and expands to the
 * fellow's payouts.
 */

type Expected = {
  fellowName: string;
  special: number;
  pre: number;
  main: number;
  training: number;
  supervision: number;
  paid: number;
  total: number;
  payouts: number;
};

let coordinatorEmail: string;
let expected: Expected;

// The dev server compiles each page on first use, which can take longer than the default.
test.describe.configure({ timeout: 3 * 60 * 1000 });

test.beforeAll(async () => {
  const coordinators = await db.query.hubCoordinator.findMany({
    where: (hc, { isNotNull }) => isNotNull(hc.assignedHubId),
    columns: { id: true, assignedHubId: true },
    orderBy: (hc, { asc }) => asc(hc.id),
  });

  for (const coordinator of coordinators) {
    const email = await emailForProfile(coordinator.id, "HUB_COORDINATOR");
    if (!email || !coordinator.assignedHubId) continue;
    // The fellow of the hub with the most payouts, whose name no other fellow of the hub shares.
    const { rows } = await db.execute<Expected>(sql`
      select f.fellow_name as "fellowName",
        (select count(*)::int from fellow_attendances fa
          join intervention_sessions s on s.id = fa.session_id
          join session_names n on n.id = s.session_id
          where fa.fellow_id = f.id and n.session_type = 'SPECIAL') as special,
        (select count(*)::int from fellow_attendances fa
          join intervention_sessions s on s.id = fa.session_id
          join session_names n on n.id = s.session_id
          where fa.fellow_id = f.id and n.session_label = 's0') as pre,
        (select count(*)::int from fellow_attendances fa
          join intervention_sessions s on s.id = fa.session_id
          join session_names n on n.id = s.session_id
          where fa.fellow_id = f.id and n.session_label in ('s1', 's2', 's3', 's4')) as main,
        (select count(*)::int from fellow_attendances fa
          join intervention_sessions s on s.id = fa.session_id
          join session_names n on n.id = s.session_id
          where fa.fellow_id = f.id and n.session_type = 'TRAINING') as training,
        (select count(*)::int from fellow_attendances fa
          join intervention_sessions s on s.id = fa.session_id
          join session_names n on n.id = s.session_id
          where fa.fellow_id = f.id and n.session_type = 'SUPERVISION') as supervision,
        (select coalesce(sum(p.amount), 0)::int from payout_statements p
          join fellow_attendances fa on fa.id = p.fellow_attendance_id
          where fa.fellow_id = f.id and p.confirmed_at is not null) as paid,
        (select coalesce(sum(p.amount), 0)::int from payout_statements p
          join fellow_attendances fa on fa.id = p.fellow_attendance_id
          where fa.fellow_id = f.id) as total,
        (select count(*)::int from payout_statements p
          join fellow_attendances fa on fa.id = p.fellow_attendance_id
          where fa.fellow_id = f.id) as payouts
      from fellows f
      where f.hub_id = ${coordinator.assignedHubId}
        and (select count(*) from fellows o
          where o.hub_id = f.hub_id and o.fellow_name ilike '%' || f.fellow_name || '%') = 1
      order by payouts desc, f.id
      limit 1`);
    if (rows[0] && rows[0].payouts > 0) {
      coordinatorEmail = email;
      expected = rows[0];
      break;
    }
  }
  if (!expected) throw new Error("seed the database first: no hub fellow with payouts");
});

test("a fellow's row shows the session counts and payout totals in the database", async ({
  page,
  context,
}) => {
  await signInWithEmail(context, coordinatorEmail);
  await page.goto(getUrl("/hc/reporting/expenses/fellows"));

  const row = await searchRows(page, expected.fellowName);
  await expect(row).toHaveCount(1);
  const cells = row.getByRole("cell");
  await expect(cells.nth(4)).toHaveText(String(expected.special));
  await expect(cells.nth(5)).toHaveText(`${expected.pre} - pre | ${expected.main} - main`);
  await expect(cells.nth(6)).toHaveText(`${expected.training} - T | ${expected.supervision} - SV`);
  await expect(cells.nth(7)).toHaveText(String(expected.paid));
  await expect(cells.nth(8)).toHaveText(String(expected.total));

  await cells.first().getByRole("button").click();
  const payoutTable = page.locator("td:has(table)");
  await expect(
    payoutTable.getByText(`1 of ${Math.ceil(expected.payouts / 10)}`, { exact: true }),
  ).toBeVisible();
  await expect(payoutTable.locator("tbody tr")).toHaveCount(Math.min(expected.payouts, 10));
});
