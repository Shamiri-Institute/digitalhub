import { expect, test } from "@playwright/test";
import { sql } from "drizzle-orm";

import { db } from "#/db/client";
import { emailForProfile, signInWithEmail } from "#/tests/helpers";
import { pickUser } from "#/tests/platform-routes";
import { getUrl, searchRows } from "#/tests/pages/helpers";

type Viewer = { path: string; email: string; fellowName: string; payouts: number };

const viewers: Partial<Record<"hc" | "sc" | "ops", Viewer>> = {};

test.describe.configure({ timeout: 3 * 60 * 1000 });

test.beforeAll(async () => {
  // Fellows with payouts in a default-project hub, whose name no other fellow shares.
  const { rows: fellows } = await db.execute<{
    fellowName: string;
    payouts: number;
    hubCoordinatorId: string | null;
    supervisorId: string | null;
  }>(sql`
    select f.fellow_name as "fellowName",
      (select count(*)::int from payout_statements p
        join fellow_attendances fa on fa.id = p.fellow_attendance_id
        where fa.fellow_id = f.id) as payouts,
      (select hc.id from hub_coordinators hc where hc.assigned_hub_id = f.hub_id
        order by hc.id limit 1) as "hubCoordinatorId",
      f.supervisor_id as "supervisorId"
    from fellows f
    join hubs h on h.id = f.hub_id
    join projects p on p.id = h.project_id and p.is_default
    where (select count(*) from fellows o where o.fellow_name ilike '%' || f.fellow_name || '%') = 1
      and exists (select 1 from payout_statements p
        join fellow_attendances fa on fa.id = p.fellow_attendance_id
        where fa.fellow_id = f.id)
    order by payouts desc, f.id`);

  for (const fellow of fellows) {
    if (!viewers.hc && fellow.hubCoordinatorId) {
      const email = await emailForProfile(fellow.hubCoordinatorId, "HUB_COORDINATOR");
      if (email) viewers.hc = { path: "/hc/reporting/expenses/fellows", email, ...fellow };
    }
    if (!viewers.sc && fellow.supervisorId) {
      const email = await emailForProfile(fellow.supervisorId, "SUPERVISOR");
      if (email) viewers.sc = { path: "/sc/reporting/expenses/fellows", email, ...fellow };
    }
  }
  const [opsFellow] = fellows;
  if (opsFellow) {
    const { email } = await pickUser("OPERATIONS");
    viewers.ops = { path: "/ops/reporting/expenses/fellows", email, ...opsFellow };
  }
});

for (const role of ["hc", "sc", "ops"] as const) {
  test(`${role}: the expanded payout rows have no action menu`, async ({ page, context }) => {
    const viewer = viewers[role];
    if (!viewer)
      throw new Error(`seed the database first: no ${role} viewer of a fellow's payouts`);
    await signInWithEmail(context, viewer.email);
    await page.goto(getUrl(viewer.path));

    const row = await searchRows(page, viewer.fellowName);
    await expect(row).toHaveCount(1);
    await row.getByRole("cell").first().getByRole("button").click();
    const payoutTable = page.locator("td:has(table)");
    await expect(payoutTable.locator("tbody tr")).toHaveCount(Math.min(viewer.payouts, 10));
    await expect(payoutTable.locator('[aria-haspopup="menu"]')).toHaveCount(0);
  });
}
