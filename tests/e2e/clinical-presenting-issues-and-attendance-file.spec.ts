import type { Page } from "@playwright/test";
import { expect, test } from "#/tests/fixtures";
import { eq, sql } from "drizzle-orm";

import { db } from "#/db/client";
import { attendanceDocuments, clinicalSessionAttendance } from "#/db/schema";
import { sessionDisplayName } from "#/lib/utils";
import { createClinicalCase, signInWithEmail, signableMember, required } from "#/tests/helpers";
import { getUrl, chooseRowAction, rowWithCell, searchRows } from "#/tests/pages/helpers";

test.describe.configure({ mode: "serial" });

type CaseFixture = { email: string; supervisorId: string; schoolId: string };
type AttendanceFixture = {
  email: string;
  userId: string;
  groupId: string;
  sessionId: string;
  schoolVisibleId: string;
  sessionLabel: string;
};

let caseOwner: CaseFixture;
let clinicalCase: { caseId: string; pseudonym: string; remove: () => Promise<void> };
let attendance: AttendanceFixture;

// "Upload attendance" opens only for an occurred session with at least 2 marked students.
async function pickOccurredSessionWithTwoMarkedStudents() {
  const {
    rows: [attendanceRow],
  } = await db.execute<AttendanceFixture>(sql`
    select u.email, u.id as "userId", g.id as "groupId", i.id as "sessionId",
      s.visible_id as "schoolVisibleId", sn.session_name as "sessionLabel"
    from intervention_groups g
    join implementer_members m on m.identifier = g.leader_id and m.role = 'FELLOW'
    join users u on u.id = m.user_id
    join schools s on s.id = g.school_id
    join intervention_sessions i on i.school_id = s.id and i.occurred
      and coalesce(i.status::text, '') <> 'Cancelled'
    join session_names sn on sn.id = i.session_id
    where ${signableMember()}
      and (select count(*) from student_attendances a
        where a.session_id = i.id and a.fellow_id = g.leader_id) >= 2
      and not exists (select 1 from attendance_documents d
        where d.group_id = g.id and d.session_id = i.id and d.archived_at is null)
    order by u.email, i.session_date, g.id
    limit 1`);
  if (!attendanceRow) {
    throw new Error(
      "seed the database first: no fellow with 2 students marked at an occurred session",
    );
  }
  return attendanceRow;
}

test.beforeAll(async () => {
  const {
    rows: [caseRow],
  } = await db.execute<CaseFixture>(sql`
    select u.email, sv.id as "supervisorId", sc.id as "schoolId"
    from supervisors sv
    join implementer_members m on m.identifier = sv.id and m.role = 'SUPERVISOR'
    join users u on u.id = m.user_id
    join schools sc on sc.hub_id = sv.hub_id and sc.archived_at is null
    where ${signableMember()}
      and exists (select 1 from intervention_groups g where g.school_id = sc.id)
    order by sv.id desc, sc.id
    limit 1`);
  required(caseRow, "no supervisor with a school");
  caseOwner = caseRow;

  const attendanceRow = await pickOccurredSessionWithTwoMarkedStudents();
  attendance = {
    ...attendanceRow,
    sessionLabel: sessionDisplayName(attendanceRow.sessionLabel) ?? attendanceRow.sessionLabel,
  };
});

test.beforeEach(async ({ undo }) => {
  clinicalCase = await createClinicalCase({
    schoolId: caseOwner.schoolId,
    currentSupervisorId: caseOwner.supervisorId,
  });
  undo(() => clinicalCase.remove());
});
function familyIssues(page: Page) {
  return page.getByRole("checkbox", { name: "Family issues" });
}

async function expandCase(page: Page) {
  const caseRow = await searchRows(page, clinicalCase.pseudonym);
  await caseRow.getByRole("button").first().click();
  await expect(page.getByRole("button", { name: "Save Baseline" })).toBeVisible();
}

test("a supervisor saves emergency, general and other presenting issues together", async ({
  page,
  context,
}) => {
  const otherIssues = `e2e other issues ${Date.now()}`;
  const highRiskBullying = page.getByRole("checkbox", { name: "Bullying: High risk" });

  await signInWithEmail(context, caseOwner.email);
  await page.goto(getUrl("/sc/clinical"));
  await expandCase(page);
  await highRiskBullying.click();
  await familyIssues(page).click();
  await page.getByRole("textbox", { name: "Other Issues" }).fill(otherIssues);
  await page.getByRole("button", { name: "Save Baseline" }).click();
  await expect(
    page.getByText("Baseline presenting issues updated successfully", { exact: true }),
  ).toBeVisible();

  await page.reload();
  await expandCase(page);
  await expect(highRiskBullying).toBeChecked();
  await expect(familyIssues(page)).toBeChecked();
  await expect(page.getByRole("textbox", { name: "Other Issues" })).toHaveValue(otherIssues);
});

test("a save from a page loaded before the case was terminated changes nothing", async ({
  page,
  context,
}) => {
  // Terminating a case names one of its clinical sessions, which no page creates.
  const sessionLabel = `e2e-termination-${Date.now()}`;
  await db.insert(clinicalSessionAttendance).values({
    caseId: clinicalCase.caseId,
    session: sessionLabel,
    supervisorId: caseOwner.supervisorId,
    attendanceStatus: true,
  });

  await signInWithEmail(context, caseOwner.email);
  await page.goto(getUrl("/sc/clinical"));
  await expandCase(page);
  await familyIssues(page).click();

  const otherTab = await context.newPage();
  await otherTab.goto(getUrl("/sc/clinical"));
  await chooseRowAction(
    otherTab,
    await searchRows(otherTab, clinicalCase.pseudonym),
    "Terminate case",
  );
  const terminate = otherTab.getByRole("dialog", { name: "Terminate Case" });
  await terminate.getByRole("combobox").filter({ hasText: "Select session" }).click();
  await otherTab.getByRole("option", { name: new RegExp(sessionLabel) }).click();
  await terminate.getByRole("combobox").filter({ hasText: "Student no-show" }).click();
  await otherTab.getByRole("option", { name: "Student refused to return to sessions" }).click();
  await terminate.getByRole("textbox", { name: /Termination Explanation/ }).fill("E2E");
  await terminate.getByRole("button", { name: "Terminate Case" }).click();
  await expect(terminate).toBeHidden();
  await otherTab.close();

  await page.getByRole("button", { name: "Save Baseline" }).click();
  await expect(
    page.getByText("The case status changed. Reload the page.", { exact: true }),
  ).toBeVisible();

  await page.reload();
  const caseRow = await searchRows(page, clinicalCase.pseudonym);
  await expect(caseRow).toContainText("Terminated");
  await caseRow.getByRole("button").first().click();
  await expect(familyIssues(page)).not.toBeChecked();
});

test("a fellow deletes their group's attendance document even when the file store fails", async ({
  page,
  context,
  undo,
}) => {
  test.skip(
    !process.env.S3_STUDENT_ATTENDANCE_BUCKET || !process.env.S3_STUDENT_ATTENDANCE_REGION,
    "set S3_STUDENT_ATTENDANCE_BUCKET and S3_STUDENT_ATTENDANCE_REGION (mock values will do)",
  );
  const fileName = `e2e-attendance-${Date.now()}.pdf`;
  const [document] = await db
    .insert(attendanceDocuments)
    .values({
      fileName,
      groupId: attendance.groupId,
      sessionId: attendance.sessionId,
      uploadedBy: attendance.userId,
      link: `e2e/${fileName}`,
    })
    .returning({ id: attendanceDocuments.id });
  if (!document) throw new Error("could not insert the attendance document fixture");
  undo(() => db.delete(attendanceDocuments).where(eq(attendanceDocuments.id, document.id)));

  await signInWithEmail(context, attendance.email);
  const dialog = page.getByRole("dialog", { name: "Attendance Document" });
  async function openAttendanceDocument() {
    await page.goto(getUrl(`/fel/schools/${attendance.schoolVisibleId}/sessions`));
    const sessionRow = await rowWithCell(page, page.getByRole("main"), attendance.sessionLabel);
    await chooseRowAction(page, sessionRow, "Upload attendance");
    await expect(dialog).toBeVisible();
  }

  await openAttendanceDocument();
  await expect(dialog.getByText(fileName)).toBeVisible();
  await dialog.getByRole("button", { name: "Delete" }).click();
  await expect(
    page.getByText("Attendance document deleted successfully.", { exact: true }),
  ).toBeVisible();

  await openAttendanceDocument();
  await expect(dialog.getByText("Upload is not available.", { exact: false })).toBeVisible();
  await expect(dialog.getByText(fileName)).toBeHidden();
});
