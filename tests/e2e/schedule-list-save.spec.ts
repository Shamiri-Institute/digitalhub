import { expect, test } from "@playwright/test";
import { eq, sql } from "drizzle-orm";

import { db } from "#/db/client";
import { interventionSession } from "#/db/schema";
import { TIME_ZONE_COOKIE } from "#/lib/schedule-view";
import { sessionDisplayName } from "#/lib/utils";
import { signableMember, signInWithEmail } from "#/tests/helpers";
import { getUrl } from "#/tests/pages/helpers";

const timeZone = "Africa/Nairobi";
test.use({ timezoneId: timeZone });

type Fixture = {
  email: string;
  sessionId: string;
  sessionName: string;
  schoolName: string;
  localDate: string;
};

let fixture: Fixture | undefined;

test.afterAll(async () => {
  if (!fixture) return;
  await db
    .update(interventionSession)
    .set({ occurred: false })
    .where(eq(interventionSession.id, fixture.sessionId));
});

// The seed leaves the past week unmarked at one school. A session with no earlier unmarked
// session of its type is one the dialog lets the supervisor mark.
async function pickPastUnmarkedSessionWithNoEarlierUnmarked(viewerTimeZone: string) {
  const {
    rows: [row],
  } = await db.execute<Fixture>(sql`
    select u.email, i.id as "sessionId", n.session_name as "sessionName",
      s.school_name as "schoolName",
      (i.session_date at time zone ${viewerTimeZone})::date::text as "localDate"
    from intervention_sessions i
    join session_names n on n.id = i.session_id
    join schools s on s.id = i.school_id and s.archived_at is null
    join implementer_members m on m.identifier = s.assigned_supervisor_id and m.role = 'SUPERVISOR'
    join users u on u.id = m.user_id and u.email is not null
    where not i.occurred and i.session_date < now()
      and coalesce(i.status::text, '') <> 'Cancelled'
      and ${signableMember()}
      and not exists (select 1 from intervention_sessions p
        join session_names pn on pn.id = p.session_id and pn."session_type" = n."session_type"
        where p.school_id = s.id and not p.occurred and p.session_date < i.session_date
          and coalesce(p.status::text, '') <> 'Cancelled')
    order by i.session_date desc, i.id
    limit 1`);
  return row;
}

test("marking a session in the list view keeps the visible range", async ({ page, context }) => {
  fixture = await pickPastUnmarkedSessionWithNoEarlierUnmarked(timeZone);
  if (!fixture) throw new Error("seed the database first: no past unmarked session");

  await signInWithEmail(context, fixture.email);
  await context.addCookies([
    { name: TIME_ZONE_COOKIE, value: timeZone, domain: "localhost", path: "/" },
  ]);
  await page.goto(getUrl(`/sc/schedule?mode=month&date=${fixture.localDate}`));
  await page.getByLabel("Select list view").click();
  await expect(page).toHaveURL(/mode=list/);

  const title = page.getByRole("heading", { level: 3 });
  const sessionRow = page
    .getByRole("row")
    .filter({ hasText: fixture.schoolName })
    .filter({ hasText: sessionDisplayName(fixture.sessionName) });
  await expect(sessionRow).toContainText("Not marked");
  const range = await title.innerText();
  const url = page.url();

  await sessionRow.locator('[aria-haspopup="menu"]').click();
  await page.getByRole("menuitem", { name: "Mark session occurrence" }).click();
  await page.getByRole("radio", { name: "Attended" }).click();
  await page.getByRole("button", { name: "Submit" }).click();
  await page.getByRole("button", { name: "Confirm" }).click();

  await expect(sessionRow).toContainText("Attended");
  await expect(title).toHaveText(range);
  expect(page.url()).toBe(url);

  await page.reload();
  await expect(sessionRow).toContainText("Attended");
  await expect(title).toHaveText(range);
});
