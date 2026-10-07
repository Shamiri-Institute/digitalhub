import { expect, type Page, test } from "@playwright/test";
import { differenceInCalendarWeeks } from "date-fns";
import { and, eq, sql } from "drizzle-orm";

import { db } from "#/db/client";
import { supervisorAttendance } from "#/db/schema";
import { signInWithEmail } from "#/tests/helpers";
import { getUrl, searchRows } from "#/tests/pages/helpers";

/**
 * A hub coordinator marks a supervisor's attendance from the schedule, first for one supervisor
 * and then in bulk. Each save must leave one row per supervisor and session. The database is used
 * to pick the fixture, to read the stored rows back and to remove them afterwards.
 */

// The dev server compiles each page on first use, which can take longer than the default.
test.describe.configure({ mode: "serial", timeout: 3 * 60 * 1000 });

type Fixture = {
  sessionId: string;
  sessionDate: Date;
  schoolName: string;
  supervisorId: string;
  supervisorName: string;
  email: string;
};
let fixture: Fixture;

test.beforeAll(async () => {
  // An occurred session, the only one at its school that week, in the hub of a coordinator who
  // can sign in, with a supervisor of that hub whose attendance is not marked yet.
  const {
    rows: [row],
  } = await db.execute<Omit<Fixture, "sessionDate"> & { sessionDate: string }>(sql`
    select i.id as "sessionId", i.session_date as "sessionDate", s.school_name as "schoolName",
      sv.id as "supervisorId", sv.supervisor_name as "supervisorName", u.email
    from hub_coordinators hc
    join implementer_members m on m.identifier = hc.id and m.role = 'HUB_COORDINATOR'
    join users u on u.id = m.user_id and u.email is not null
    join schools s on s.hub_id = hc.assigned_hub_id and s.archived_at is null
    join intervention_sessions i on i.school_id = s.id and i.occurred
      and coalesce(i.status::text, '') <> 'Cancelled'
    join supervisors sv on sv.hub_id = hc.assigned_hub_id and sv.supervisor_name is not null
      and coalesce(sv.dropped_out, false) = false
    where (select count(*) from implementer_members o where o.user_id = m.user_id) = 1
      and not exists (
        select 1 from supervisor_attendances a where a.session_id = i.id and a.supervisor_id = sv.id)
      and not exists (
        select 1 from intervention_sessions o where o.school_id = i.school_id and o.id <> i.id
          and abs(extract(epoch from o.session_date - i.session_date)) < 7 * 24 * 3600)
      and (select count(*) from supervisors o
        where o.hub_id = sv.hub_id and o.supervisor_name = sv.supervisor_name) = 1
    order by i.session_date desc, i.id, sv.id
    limit 1`);
  if (!row) throw new Error("seed the database first: no unmarked supervisor for a session");
  fixture = { ...row, sessionDate: new Date(row.sessionDate) };
});

test.afterAll(async () => {
  await db
    .delete(supervisorAttendance)
    .where(
      and(
        eq(supervisorAttendance.sessionId, fixture.sessionId),
        eq(supervisorAttendance.supervisorId, fixture.supervisorId),
      ),
    );
});

async function openSupervisorAttendance(page: Page) {
  await page.goto(getUrl("/hc/schedule?mode=list"), { waitUntil: "networkidle" });
  const weeksBack = differenceInCalendarWeeks(new Date(), fixture.sessionDate);
  for (let i = 0; i < weeksBack; i++) {
    await page.getByRole("button", { name: "Previous" }).click();
    await page.waitForLoadState("networkidle");
  }
  const sessionRow = page.getByRole("row").filter({ hasText: fixture.schoolName }).first();
  const dialog = page.getByRole("dialog", { name: "Mark supervisor attendance" });
  // The menu can close while the calendar re-renders with data that loads after the page.
  await expect(async () => {
    await sessionRow.getByRole("cell").last().click();
    await page.getByRole("menuitem", { name: "Mark supervisor attendance" }).click({
      timeout: 2000,
    });
    await expect(dialog).toBeVisible({ timeout: 2000 });
  }).toPass({ timeout: 30_000 });
  return dialog;
}

async function storedAttendances() {
  return db
    .select({ attended: supervisorAttendance.attended })
    .from(supervisorAttendance)
    .where(
      and(
        eq(supervisorAttendance.sessionId, fixture.sessionId),
        eq(supervisorAttendance.supervisorId, fixture.supervisorId),
      ),
    );
}

test("a hub coordinator marks a supervisor attended, then missed in bulk", async ({
  page,
  context,
}) => {
  await signInWithEmail(context, fixture.email);

  await openSupervisorAttendance(page);
  const supervisorRow = await searchRows(page, fixture.supervisorName);
  await supervisorRow.getByRole("cell").last().click();
  await page.getByRole("menuitem", { name: "Mark attendance" }).click();
  const mark = page.getByRole("dialog").filter({ hasText: "Select attendance" });
  await mark.getByRole("radio").first().click();
  await mark.getByRole("button", { name: "Submit" }).click();
  await expect(mark).toBeHidden();

  await page.reload({ waitUntil: "networkidle" });
  await openSupervisorAttendance(page);
  await expect(await searchRows(page, fixture.supervisorName)).toContainText("Attended");
  expect(await storedAttendances()).toEqual([{ attended: true }]);

  const reopenedRow = await searchRows(page, fixture.supervisorName);
  await reopenedRow.getByRole("checkbox", { name: "Select row" }).check();
  await page
    .getByRole("dialog", { name: "Mark supervisor attendance" })
    .getByRole("button", { name: "Mark supervisor attendance" })
    .click();
  const bulkMark = page.getByRole("dialog").filter({ hasText: "Select attendance" });
  await bulkMark.getByRole("radio").nth(1).click();
  await bulkMark.getByRole("combobox", { name: "Select reason for above" }).click();
  await page.getByRole("option").first().click();
  await bulkMark.getByRole("button", { name: "Submit" }).click();
  await expect(bulkMark).toBeHidden();

  await page.reload({ waitUntil: "networkidle" });
  await openSupervisorAttendance(page);
  await expect(await searchRows(page, fixture.supervisorName)).toContainText("Missed");
  expect(await storedAttendances()).toEqual([{ attended: false }]);
});
