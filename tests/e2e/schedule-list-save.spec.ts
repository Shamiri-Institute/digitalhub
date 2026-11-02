import { eq, sql } from "drizzle-orm";

import { db } from "#/db/client";
import { interventionSession } from "#/db/schema";
import { objectId } from "#/lib/crypto";
import { TIME_ZONE_COOKIE } from "#/lib/schedule-view";
import { sessionDisplayName } from "#/lib/utils";
import { expect, test } from "#/tests/fixtures";
import { signableMember, signInWithEmail, required } from "#/tests/helpers";
import { getUrl } from "#/tests/pages/helpers";

const timeZone = "Africa/Nairobi";
test.use({ timezoneId: timeZone });

type Fixture = {
  email: string;
  hubId: string;
  schoolId: string;
  schoolName: string;
  sessionNameId: string;
  sessionName: string;
};

// A supervisor's school with no unmarked past intervention session, and an intervention session
// type the school has no session of within a month of now. A session of that type there yesterday is
// then one the dialog lets the supervisor mark, and the only row of its name in the month's list.
async function pickSchoolForAPastSession() {
  const {
    rows: [row],
  } = await db.execute<Fixture>(sql`
    select u.email, s.hub_id as "hubId", s.id as "schoolId", s.school_name as "schoolName",
      n.id as "sessionNameId", n.session_name as "sessionName"
    from schools s
    join implementer_members m on m.identifier = s.assigned_supervisor_id and m.role = 'SUPERVISOR'
    join users u on u.id = m.user_id
    join session_names n on n.hub_id = s.hub_id and n."session_type" = 'INTERVENTION'
    where s.archived_at is null and ${signableMember()}
      and not exists (select 1 from intervention_sessions i where i.school_id = s.id
        and i.session_id = n.id and i.session_date > now() - interval '40 days'
        and i.session_date < now() + interval '40 days')
      and not exists (select 1 from intervention_sessions p
        join session_names pn on pn.id = p.session_id and pn."session_type" = 'INTERVENTION'
        where p.school_id = s.id and not p.occurred and p.session_date < now()
          and coalesce(p.status::text, '') <> 'Cancelled')
      and (select count(*) from schools o where o.school_name = s.school_name) = 1
    order by u.email, s.visible_id, n.session_name
    limit 1`);
  return row;
}

test("marking a session in the list view keeps the visible range", async ({
  page,
  context,
  undo,
}) => {
  const fixture = await pickSchoolForAPastSession();
  required(fixture, "a supervisor's school with every past session marked");
  // Yesterday at 09:00 in Nairobi.
  const sessionDate = new Date(Date.now() - 24 * 3600 * 1000);
  sessionDate.setUTCHours(6, 0, 0, 0);
  const localDate = new Intl.DateTimeFormat("en-CA", { timeZone }).format(sessionDate);
  const sessionId = objectId("session");
  await db.insert(interventionSession).values({
    id: sessionId,
    hubId: fixture.hubId,
    schoolId: fixture.schoolId,
    sessionId: fixture.sessionNameId,
    // The list labels a session by this copy of its code, as scheduling one stores it.
    sessionType: fixture.sessionName,
    occurred: false,
    yearOfImplementation: sessionDate.getFullYear(),
    sessionDate,
  });
  undo(() => db.delete(interventionSession).where(eq(interventionSession.id, sessionId)));

  await signInWithEmail(context, fixture.email);
  await context.addCookies([
    { name: TIME_ZONE_COOKIE, value: timeZone, domain: "localhost", path: "/" },
  ]);
  await page.goto(getUrl(`/sc/schedule?mode=month&date=${localDate}`));
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
