import { expect, test } from "@playwright/test";
import { sql } from "drizzle-orm";

import { db } from "#/db/client";
import { operationsAdminEmail } from "#/db/seed/fixtures";
import { emailForProfile, signInWithEmail, required } from "#/tests/helpers";
import { expandRow, getUrl, searchRows } from "#/tests/pages/helpers";

type Viewer = { path: string; email: string; fellowName: string; payouts: number };

const viewers: Partial<Record<"sc" | "hc" | "admin", Viewer>> = {};

async function pickUniquelyNamedFellowsWithPayouts() {
  const { rows } = await db.execute<{
    fellowName: string;
    payouts: number;
    supervisorId: string | null;
    hubId: string;
  }>(sql`
    select f.fellow_name as "fellowName",
      (select count(*)::int from payout_statements p
        join fellow_attendances fa on fa.id = p.fellow_attendance_id
        where fa.fellow_id = f.id) as payouts,
      f.supervisor_id as "supervisorId", f.hub_id as "hubId"
    from fellows f
    join hubs h on h.id = f.hub_id
    join projects p on p.id = h.project_id and p.is_default
    where (select count(*) from fellows o where o.fellow_name ilike '%' || f.fellow_name || '%') = 1
      and exists (select 1 from payout_statements p
        join fellow_attendances fa on fa.id = p.fellow_attendance_id
        where fa.fellow_id = f.id)
    order by payouts desc, f.id`);
  return rows;
}

test.beforeAll(async () => {
  const fellows = await pickUniquelyNamedFellowsWithPayouts();

  for (const fellow of fellows) {
    if (!viewers.sc && fellow.supervisorId) {
      const email = await emailForProfile(fellow.supervisorId, "SUPERVISOR");
      if (email) viewers.sc = { path: "/sc/reporting/expenses/fellows", email, ...fellow };
    }
    if (!viewers.hc) {
      const coordinator = await db.query.hubCoordinator.findFirst({
        where: (hc, { eq }) => eq(hc.assignedHubId, fellow.hubId),
        columns: { id: true },
        orderBy: (hc, { asc }) => asc(hc.id),
      });
      const email = coordinator && (await emailForProfile(coordinator.id, "HUB_COORDINATOR"));
      if (email) viewers.hc = { path: "/hc/reporting/expenses/fellows", email, ...fellow };
    }
  }
  const [adminFellow] = fellows;
  if (adminFellow) {
    viewers.admin = {
      path: "/admin/reporting/expenses/fellows",
      email: operationsAdminEmail,
      ...adminFellow,
    };
  }
});

for (const role of ["sc", "hc", "admin"] as const) {
  test(`R-pay-menu-removed: ${role}: the expanded payout rows have no action menu`, async ({
    page,
    context,
  }) => {
    const viewer = viewers[role];
    required(viewer, `no ${role} viewer of a fellow's payouts`);
    await signInWithEmail(context, viewer.email);
    await page.goto(getUrl(viewer.path));

    const row = await searchRows(page, viewer.fellowName);
    await expect(row).toHaveCount(1);
    const payoutTable = await expandRow(page, row);
    await expect(payoutTable.locator("tbody tr")).toHaveCount(Math.min(viewer.payouts, 10));
    await expect(payoutTable.locator('[aria-haspopup="menu"]')).toHaveCount(0);
  });
}
