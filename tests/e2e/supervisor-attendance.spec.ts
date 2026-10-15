import { expect, type Page, test } from "@playwright/test";
import { and, eq, sql } from "drizzle-orm";

import { db } from "#/db/client";
import { supervisorAttendance } from "#/db/schema";
import { onlySessionAtSchoolThatWeek, signableMember, signInWithEmail } from "#/tests/helpers";
import { chooseRowAction, scheduleUrl, searchRows } from "#/tests/pages/helpers";

test.describe.configure({ mode: "serial" });

type Fixture = {
  sessionId: string;
  sessionDate: Date;
  schoolName: string;
  supervisorId: string;
  supervisorName: string;
  email: string;
};
let fixture: Fixture;

async function pickLoneOccurredSessionWithUnmarkedSupervisor() {
  const {
    rows: [row],
  } = await db.execute<Omit<Fixture, "sessionDate"> & { sessionDate: string }>(sql`
    select i.id as "sessionId", i.session_date as "sessionDate", s.school_name as "schoolName",
      sv.id as "supervisorId", sv.supervisor_name as "supervisorName", u.email
    from hub_coordinators hc
    join implementer_members m on m.identifier = hc.id and m.role = 'HUB_COORDINATOR'
    join users u on u.id = m.user_id
    join schools s on s.hub_id = hc.assigned_hub_id and s.archived_at is null
    join intervention_sessions i on i.school_id = s.id and i.occurred
      and coalesce(i.status::text, '') <> 'Cancelled'
    join supervisors sv on sv.hub_id = hc.assigned_hub_id and sv.supervisor_name is not null
      and coalesce(sv.dropped_out, false) = false
    where ${signableMember()}
      and not exists (
        select 1 from supervisor_attendances a where a.session_id = i.id and a.supervisor_id = sv.id)
      and ${onlySessionAtSchoolThatWeek()}
      and (select count(*) from supervisors o
        where o.hub_id = sv.hub_id and o.supervisor_name = sv.supervisor_name) = 1
    order by i.session_date desc, i.id, sv.id
    limit 1`);
  if (!row) throw new Error("seed the database first: no unmarked supervisor for a session");
  return row;
}

test.beforeAll(async () => {
  const row = await pickLoneOccurredSessionWithUnmarkedSupervisor();
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
  await page.goto(await scheduleUrl(page.context(), "/hc/schedule?mode=list", fixture.sessionDate));
  const sessionRow = page.getByRole("row").filter({ hasText: fixture.schoolName }).first();
  const dialog = page.getByRole("dialog", { name: "Mark supervisor attendance" });
  await chooseRowAction(page, sessionRow, "Mark supervisor attendance");
  return dialog;
}

/** One row throughout: marking again, alone or in bulk, updates it rather than adding another. */
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
  await chooseRowAction(page, supervisorRow, "Mark attendance");
  const mark = page.getByRole("dialog").filter({ hasText: "Select attendance" });
  await mark.getByRole("radio").first().click();
  await mark.getByRole("button", { name: "Submit" }).click();
  await expect(mark).toBeHidden();

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
  await bulkMark.getByRole("radio", { name: "Missed" }).click();
  await bulkMark.getByRole("combobox", { name: "Select reason for above" }).click();
  await page.getByRole("option").first().click();
  await bulkMark.getByRole("button", { name: "Submit" }).click();
  await expect(bulkMark).toBeHidden();

  await openSupervisorAttendance(page);
  await expect(await searchRows(page, fixture.supervisorName)).toContainText("Missed");
  expect(await storedAttendances()).toEqual([{ attended: false }]);
});
