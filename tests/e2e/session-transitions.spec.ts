import { type Page } from "@playwright/test";
import { eq, sql } from "drizzle-orm";

import { db } from "#/db/client";
import { interventionSession } from "#/db/schema";
import { objectId } from "#/lib/crypto";
import { TIME_ZONE_COOKIE } from "#/lib/schedule-view";
import { sessionDisplayName } from "#/lib/utils";
import { expect, test, type Undo } from "#/tests/fixtures";
import { signableMember, signInWithEmail, required } from "#/tests/helpers";
import { chooseRowAction, getUrl } from "#/tests/pages/helpers";

const timeZone = "Africa/Nairobi";
test.use({ timezoneId: timeZone });
// Both tests pick the same school and session type, so they take turns.
test.describe.configure({ mode: "serial" });

type Fixture = {
  email: string;
  hubId: string;
  schoolId: string;
  schoolName: string;
  sessionNameId: string;
  sessionName: string;
};

// A supervisor's school with every past intervention session marked, and an intervention session
// type it has no session of within a month of now. Ordered from the other end to
// schedule-list-save.spec.ts, which picks the same way, so the two specs use different schools.
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
    order by u.email desc, s.visible_id desc, n.session_name desc
    limit 1`);
  return row;
}

async function createPastSession(undo: Undo) {
  const fixture = await pickSchoolForAPastSession();
  required(fixture, "a supervisor's school with every past session marked");
  // Yesterday at 09:00 in Nairobi.
  const sessionDate = new Date(Date.now() - 24 * 3600 * 1000);
  sessionDate.setUTCHours(6, 0, 0, 0);
  const sessionId = objectId("session");
  await db.insert(interventionSession).values({
    id: sessionId,
    hubId: fixture.hubId,
    schoolId: fixture.schoolId,
    sessionId: fixture.sessionNameId,
    sessionType: fixture.sessionName,
    occurred: false,
    yearOfImplementation: sessionDate.getFullYear(),
    sessionDate,
  });
  undo(() => db.delete(interventionSession).where(eq(interventionSession.id, sessionId)));
  const localDate = new Intl.DateTimeFormat("en-CA", { timeZone }).format(sessionDate);
  return { ...fixture, sessionId, localDate };
}

async function openListView(page: Page, localDate: string) {
  await page.goto(getUrl(`/sc/schedule?mode=list&date=${localDate}`), {
    waitUntil: "networkidle",
  });
}

function sessionRowOf(page: Page, fixture: { schoolName: string; sessionName: string }) {
  return page
    .getByRole("row")
    .filter({ hasText: fixture.schoolName })
    .filter({ hasText: sessionDisplayName(fixture.sessionName) });
}

test.beforeEach(async ({ context }) => {
  await context.addCookies([
    { name: TIME_ZONE_COOKIE, value: timeZone, domain: "localhost", path: "/" },
  ]);
});

test("a session cancelled in another tab is not marked as occurred", async ({
  page,
  context,
  undo,
}) => {
  const fixture = await createPastSession(undo);
  await signInWithEmail(context, fixture.email);

  await openListView(page, fixture.localDate);
  const sessionRow = sessionRowOf(page, fixture);
  await expect(sessionRow).toContainText("Not marked");
  await chooseRowAction(page, sessionRow, "Mark session occurrence");
  await page.getByRole("radio", { name: "Attended" }).click();
  await page.getByRole("button", { name: "Submit" }).click();

  const otherTab = await context.newPage();
  await openListView(otherTab, fixture.localDate);
  await chooseRowAction(otherTab, sessionRowOf(otherTab, fixture), "Cancel session");
  await otherTab.getByRole("button", { name: "Confirm" }).click();
  await expect(sessionRowOf(otherTab, fixture)).toContainText("Cancelled");

  await page.getByRole("button", { name: "Confirm" }).click();
  await expect(page.getByText("This session has been cancelled").first()).toBeVisible();

  await page.reload();
  await expect(sessionRow).toContainText("Cancelled");
  // The list shows a cancelled session as Cancelled whether or not it occurred, so only the
  // database shows that the occurrence was refused.
  const stored = await db.query.interventionSession.findFirst({
    where: (s, { eq }) => eq(s.id, fixture.sessionId),
    columns: { occurred: true },
  });
  expect(stored?.occurred).toBe(false);
});

test("a session marked as occurred in another tab is not cancelled", async ({
  page,
  context,
  undo,
}) => {
  const fixture = await createPastSession(undo);
  await signInWithEmail(context, fixture.email);

  await openListView(page, fixture.localDate);
  const sessionRow = sessionRowOf(page, fixture);
  await expect(sessionRow).toContainText("Not marked");
  await chooseRowAction(page, sessionRow, "Cancel session");

  const otherTab = await context.newPage();
  await openListView(otherTab, fixture.localDate);
  await chooseRowAction(otherTab, sessionRowOf(otherTab, fixture), "Mark session occurrence");
  await otherTab.getByRole("radio", { name: "Attended" }).click();
  await otherTab.getByRole("button", { name: "Submit" }).click();
  await otherTab.getByRole("button", { name: "Confirm" }).click();
  await expect(sessionRowOf(otherTab, fixture)).toContainText("Attended");

  await page.getByRole("button", { name: "Confirm" }).click();
  await expect(page.getByText("This session has already occurred").first()).toBeVisible();

  await page.reload();
  await expect(sessionRow).toContainText("Attended");
});
