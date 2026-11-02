import { expect, test } from "#/tests/fixtures";
import { eq, sql } from "drizzle-orm";

import { db } from "#/db/client";
import { clinicalScreeningInfo, clinicalSessionAttendance, user } from "#/db/schema";
import { sessionDisplayName } from "#/lib/utils";
import {
  createAdminCopy,
  createClinicalCase,
  required,
  signableMember,
  signInWithEmail,
} from "#/tests/helpers";
import { chooseRowAction, getUrl, rowWithCell, searchRows } from "#/tests/pages/helpers";

// Each test renders a page, then takes away the caller's access to a row the spec owns, so the
// dialog's load passes its sign-in check and throws "not found". Revoking the sign-in instead
// sends the page to the login screen: the action clears the session cookie, and Next re-renders
// the page for an action that changes cookies.

test("student attendance shows a failed load as a failure, not as no students", async ({
  page,
  context,
  undo,
}) => {
  const {
    rows: [fixture],
  } = await db.execute<{
    userId: string;
    visibleId: string;
    sessionName: string;
    projectId: string;
    otherProjectId: string;
  }>(sql`
    select u.id as "userId", s.visible_id as "visibleId", sn.session_name as "sessionName",
      h.project_id as "projectId", other_hub.project_id as "otherProjectId"
    from users u
    join implementer_members m on m.user_id = u.id and m.role = 'ADMIN'
    join hubs h on h.implementer_id = m.implementer_id
    join schools s on s.hub_id = h.id and s.archived_at is null
    join intervention_sessions i on i.school_id = s.id and i.occurred
      and coalesce(i.status::text, '') <> 'Cancelled'
    join session_names sn on sn.id = i.session_id
    join implementer_members other_m on other_m.user_id = u.id and other_m.role = 'ADMIN'
    join hubs other_hub on other_hub.implementer_id = other_m.implementer_id
      and other_hub.project_id <> h.project_id
    where u.archived_at is null
      and (select count(distinct o.implementer_id) from implementer_members o
        join hubs oh on oh.implementer_id = o.implementer_id
        where o.user_id = u.id and o.role = 'ADMIN' and oh.project_id = h.project_id) = 1
      and (select count(*) from intervention_sessions o
        where o.school_id = s.id and o.session_id = i.session_id) = 1
    order by u.email, s.visible_id, i.session_date, i.id, other_hub.project_id
    limit 1`);
  required(fixture, "no admin of hubs in two projects with an occurred session");
  const admin = await createAdminCopy(fixture.userId, fixture.projectId);
  undo(admin.remove);
  await signInWithEmail(context, admin.email);

  await page.goto(getUrl(`/admin/schools/${fixture.visibleId}/sessions`));
  const sessionRow = await rowWithCell(
    page,
    page.getByRole("main"),
    sessionDisplayName(fixture.sessionName) ?? fixture.sessionName,
  );
  await expect(sessionRow).toBeVisible();
  // As the project switcher does from another tab: this page still lists the old project's
  // session, which the server now hides from the admin.
  await db
    .update(user)
    .set({ activeProjectId: fixture.otherProjectId })
    .where(eq(user.id, admin.id));
  await chooseRowAction(page, sessionRow, "View student attendance");

  const attendance = page.getByRole("dialog", { name: "View student attendance" });
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
  await signInWithEmail(context, fixture.email);

  await page.goto(getUrl("/sc/clinical"));
  const caseRow = await searchRows(page, ownCase.pseudonym);
  await expect(caseRow).toBeVisible();
  // As a transfer would: this page still lists the case, which the server no longer lets the
  // supervisor read.
  await db
    .update(clinicalScreeningInfo)
    .set({ currentSupervisorId: null })
    .where(eq(clinicalScreeningInfo.id, ownCase.caseId));
  await chooseRowAction(page, caseRow, "Case notes");

  const dialog = page.getByRole("dialog", { name: "Case Notes" });
  await expect(
    dialog.getByRole("alert").filter({ hasText: "Could not load this case's notes" }),
  ).toBeVisible();
  await expect(dialog.getByRole("combobox").filter({ hasText: "Select session" })).toBeDisabled();
  await expect(dialog.getByRole("textbox", { name: /Situation/ })).toBeDisabled();
  await expect(dialog.getByRole("button", { name: "Submit" })).toHaveCount(0);
});
