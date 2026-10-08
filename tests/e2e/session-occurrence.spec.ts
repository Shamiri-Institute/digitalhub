import { expect, test } from "@playwright/test";
import { format } from "date-fns";
import { sql } from "drizzle-orm";

import { db } from "#/db/client";
import { signableMember, signInWithEmail } from "#/tests/helpers";
import { getUrl } from "#/tests/pages/helpers";

/**
 * On a school's sessions page, marking a session's occurrence must first ask for the earlier
 * unmarked sessions of the same type, the same as on the schedule.
 */

test.describe.configure({ timeout: 3 * 60 * 1000 });

type Fixture = {
  email: string;
  visibleId: string;
  sessionDate: string;
  earlierSessionDate: string;
};

test("the school sessions page lists earlier unmarked sessions before marking one", async ({
  page,
  context,
}) => {
  const {
    rows: [fixture],
  } = await db.execute<Fixture>(sql`
    select u.email, s.visible_id as "visibleId", i.session_date as "sessionDate",
      p.session_date as "earlierSessionDate"
    from supervisors sv
    join implementer_members m on m.identifier = sv.id and m.role = 'SUPERVISOR'
    join users u on u.id = m.user_id and u.email is not null
    join schools s on s.assigned_supervisor_id = sv.id and s.archived_at is null
    join intervention_sessions i on i.school_id = s.id and not i.occurred
      and coalesce(i.status::text, '') <> 'Cancelled'
    join session_names n on n.id = i.session_id
    join intervention_sessions p on p.school_id = s.id and not p.occurred
      and coalesce(p.status::text, '') <> 'Cancelled' and p.session_date < i.session_date
    join session_names pn on pn.id = p.session_id and pn."session_type" = n."session_type"
    where ${signableMember()}
      and (select count(*) from intervention_sessions o where o.school_id = s.id) <= 10
      and (select count(*) from intervention_sessions o
        where o.school_id = s.id and o.session_date::date = i.session_date::date) = 1
    order by s.visible_id, i.session_date, p.session_date desc
    limit 1`);
  if (!fixture) throw new Error("seed the database first: no school with two unmarked sessions");

  await signInWithEmail(context, fixture.email);
  await page.goto(getUrl(`/sc/schools/${fixture.visibleId}/sessions`), {
    waitUntil: "networkidle",
  });

  const sessionRow = page.getByRole("row").filter({
    has: page.locator("td:first-child", {
      hasText: format(new Date(fixture.sessionDate), "dd MMM yyyy"),
    }),
  });
  await sessionRow.locator('[aria-haspopup="menu"]').click();
  await page.getByRole("menuitem", { name: "Mark session occurrence" }).click();

  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText("Unmarked sessions found")).toBeVisible();
  await expect(
    dialog.getByText(format(new Date(fixture.earlierSessionDate), "dd/MM/yyyy - h:mm a")),
  ).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Submit" })).toHaveCount(0);
});
