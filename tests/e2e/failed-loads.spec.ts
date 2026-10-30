import type { BrowserContext } from "@playwright/test";
import { expect, test, type Undo } from "#/tests/fixtures";
import { eq, sql } from "drizzle-orm";

import { db } from "#/db/client";
import { session as authSession, clinicalSessionAttendance } from "#/db/schema";
import { sessionDisplayName } from "#/lib/utils";
import { createClinicalCase, required, sessionCookieFor, signableMember } from "#/tests/helpers";
import { chooseRowAction, getUrl, rowWithCell, searchRows } from "#/tests/pages/helpers";

/**
 * Signs in as `email` and returns what revokes that sign-in. Revoking it after a page renders
 * makes the page's next server action fail, as it does when a session expires with the page open.
 */
async function revocableSignIn(context: BrowserContext, email: string, undo: Undo) {
  const cookie = await sessionCookieFor(email);
  await context.addCookies([cookie]);
  const [token = ""] = decodeURIComponent(cookie.value).split(".");
  const revoke = () => db.delete(authSession).where(eq(authSession.token, token));
  undo(revoke);
  return revoke;
}

test("a fellow's student attendance shows a failed load as a failure, not as no students", async ({
  page,
  context,
  undo,
}) => {
  const {
    rows: [fixture],
  } = await db.execute<{ email: string; visibleId: string; sessionLabel: string }>(sql`
    select u.email, s.visible_id as "visibleId", sn.session_name as "sessionLabel"
    from intervention_groups g
    join implementer_members m on m.identifier = g.leader_id and m.role = 'FELLOW'
    join users u on u.id = m.user_id
    join schools s on s.id = g.school_id and s.archived_at is null
    join intervention_sessions i on i.school_id = s.id and i.occurred
      and coalesce(i.status::text, '') <> 'Cancelled'
    join session_names sn on sn.id = i.session_id and sn.session_type <> 'DATA_COLLECTION'
    where ${signableMember()} and g.archived_at is null
      and exists (select 1 from students st
        where st.assigned_group_id = g.id and st.archived_at is null)
      and not exists (select 1 from intervention_sessions o
        where o.school_id = i.school_id and o.session_id = i.session_id and o.id <> i.id)
    order by u.email, i.session_date
    limit 1`);
  required(fixture, "no fellow leading a group with students at a school with an occurred session");
  const revoke = await revocableSignIn(context, fixture.email, undo);

  await page.goto(getUrl(`/fel/schools/${fixture.visibleId}/sessions`));
  const sessionRow = await rowWithCell(
    page,
    page.getByRole("main"),
    sessionDisplayName(fixture.sessionLabel) ?? fixture.sessionLabel,
  );
  await expect(sessionRow).toBeVisible();
  await revoke();
  await chooseRowAction(page, sessionRow, "Mark student attendance");

  const attendance = page.getByRole("dialog", { name: "Mark student attendance" });
  await expect(
    attendance
      .getByRole("alert")
      .filter({ hasText: "Could not load the students and their attendance" }),
  ).toBeVisible();
  await expect(attendance.getByRole("table")).toHaveCount(0);
  await expect(attendance.getByText("No students associated to this group")).toHaveCount(0);
});

test("case notes show a failed load as a failure and keep the sessions locked", async ({
  page,
  context,
  undo,
}) => {
  const {
    rows: [fixture],
  } = await db.execute<{ email: string; supervisorId: string; schoolId: string }>(sql`
    select u.email, sup.id as "supervisorId", s.id as "schoolId"
    from supervisors sup
    join implementer_members m on m.identifier = sup.id and m.role = 'SUPERVISOR'
    join users u on u.id = m.user_id
    join schools s on s.hub_id = sup.hub_id and s.archived_at is null
    where ${signableMember()}
      and exists (select 1 from intervention_groups g
        where g.school_id = s.id and g.archived_at is null)
    order by u.email, s.id
    limit 1`);
  required(fixture, "no supervisor with a school that has a group");
  const ownCase = await createClinicalCase({
    schoolId: fixture.schoolId,
    currentSupervisorId: fixture.supervisorId,
  });
  undo(ownCase.remove);
  // A session to choose, so the select would be enabled had the notes loaded.
  await db.insert(clinicalSessionAttendance).values({
    caseId: ownCase.caseId,
    session: `e2e-failed-notes-${Date.now()}`,
    supervisorId: fixture.supervisorId,
    attendanceStatus: true,
  });
  const revoke = await revocableSignIn(context, fixture.email, undo);

  await page.goto(getUrl("/sc/clinical"));
  const caseRow = await searchRows(page, ownCase.pseudonym);
  await expect(caseRow).toBeVisible();
  await revoke();
  await chooseRowAction(page, caseRow, "Case notes");

  const dialog = page.getByRole("dialog", { name: "Case Notes" });
  await expect(
    dialog.getByRole("alert").filter({ hasText: "Could not load this case's notes" }),
  ).toBeVisible();
  await expect(dialog.getByRole("combobox").filter({ hasText: "Select session" })).toBeDisabled();
  await expect(dialog.getByRole("textbox", { name: /Situation/ })).toBeDisabled();
  await expect(dialog.getByRole("button", { name: "Submit" })).toHaveCount(0);
});
