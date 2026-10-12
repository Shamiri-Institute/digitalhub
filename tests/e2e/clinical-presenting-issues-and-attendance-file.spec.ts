import { expect, type Locator, type Page, test } from "@playwright/test";
import { eq, sql } from "drizzle-orm";

import { db } from "#/db/client";
import { attendanceDocuments, clinicalSessionAttendance } from "#/db/schema";
import { sessionDisplayName } from "#/lib/utils";
import { createClinicalCase, signInWithEmail, signableMember } from "#/tests/helpers";
import { getUrl, chooseRowAction, searchRows } from "#/tests/pages/helpers";

/**
 * A supervisor saves a clinical case's baseline presenting issues (emergency, general and other
 * issues in one save), and a fellow deletes the attendance document of a group they lead. Locally
 * there is no S3, so the delete also proves that a failed object delete still archives the file.
 * Each test saves, reloads and checks what the page shows; the database is used only to pick or
 * add fixtures and to remove them. Each test gets a new case.
 */

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

test.beforeAll(async () => {
  const {
    rows: [caseRow],
  } = await db.execute<CaseFixture>(sql`
    select u.email, sv.id as "supervisorId", sc.id as "schoolId"
    from supervisors sv
    join implementer_members m on m.identifier = sv.id and m.role = 'SUPERVISOR'
    join users u on u.id = m.user_id and u.email is not null
    join schools sc on sc.hub_id = sv.hub_id and sc.archived_at is null
    where ${signableMember()}
      and exists (select 1 from intervention_groups g where g.school_id = sc.id)
    order by sv.id desc, sc.id
    limit 1`);
  if (!caseRow) throw new Error("seed the database first: no supervisor with a school");
  caseOwner = caseRow;

  // "Upload attendance" opens only for an occurred session with at least 2 marked students.
  const {
    rows: [attendanceRow],
  } = await db.execute<AttendanceFixture>(sql`
    select u.email, u.id as "userId", g.id as "groupId", i.id as "sessionId",
      s.visible_id as "schoolVisibleId", sn.session_name as "sessionLabel"
    from intervention_groups g
    join implementer_members m on m.identifier = g.leader_id and m.role = 'FELLOW'
    join users u on u.id = m.user_id and u.email is not null
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
  attendance = {
    ...attendanceRow,
    sessionLabel: sessionDisplayName(attendanceRow.sessionLabel) ?? attendanceRow.sessionLabel,
  };
});

// Cleanup runs in afterEach, not in a finally block: when a test times out, Playwright abandons
// its body but still runs the hooks.
let undo: (() => Promise<unknown>)[] = [];
test.beforeEach(async () => {
  clinicalCase = await createClinicalCase({
    schoolId: caseOwner.schoolId,
    currentSupervisorId: caseOwner.supervisorId,
  });
  undo.push(() => clinicalCase.remove());
});
test.afterEach(async () => {
  for (const step of undo.reverse()) {
    await step();
  }
  undo = [];
});

/** A row of the expanded diagnosing board. The case's own row also contains it, so take the last. */
function issueRow(page: Page, issue: string) {
  return page
    .getByRole("row")
    .filter({ has: page.getByRole("cell", { name: issue, exact: true }) })
    .last();
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
  // The checkboxes are unlabelled; the emergency columns are Low, Moderate, High, Severe risk.
  const highRiskBullying = (row: Locator) => row.getByRole("checkbox").nth(2);

  await signInWithEmail(context, caseOwner.email);
  await page.goto(getUrl("/sc/clinical"));
  await expandCase(page);
  await highRiskBullying(issueRow(page, "Bullying")).click();
  await issueRow(page, "Family issues").getByRole("checkbox").click();
  await page.getByRole("textbox", { name: "Other Issues" }).fill(otherIssues);
  await page.getByRole("button", { name: "Save Baseline" }).click();
  await expect(
    page.getByText("Baseline presenting issues updated successfully", { exact: true }),
  ).toBeVisible();

  await page.reload();
  await expandCase(page);
  await expect(highRiskBullying(issueRow(page, "Bullying"))).toBeChecked();
  await expect(issueRow(page, "Family issues").getByRole("checkbox")).toBeChecked();
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
  await issueRow(page, "Family issues").getByRole("checkbox").click();

  // The same supervisor terminates the case in another tab while this page still shows it active.
  const otherTab = await context.newPage();
  await otherTab.goto(getUrl("/sc/clinical"));
  await chooseRowAction(
    otherTab,
    await searchRows(otherTab, clinicalCase.pseudonym),
    "Terminate case",
  );
  const terminate = otherTab
    .getByRole("dialog")
    .filter({ has: otherTab.getByRole("heading", { name: "Terminate Case" }) });
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
  await expect(issueRow(page, "Family issues").getByRole("checkbox")).not.toBeChecked();
});

test("a fellow deletes their group's attendance document even when the file store fails", async ({
  page,
  context,
}) => {
  // The dialog presigns the file's URL before it shows the Delete button. CI sets mock values.
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
  undo.push(() => db.delete(attendanceDocuments).where(eq(attendanceDocuments.id, document.id)));

  await signInWithEmail(context, attendance.email);
  const dialog = page.getByRole("dialog", { name: "Attendance Document" });
  async function openAttendanceDocument() {
    await page.goto(getUrl(`/fel/schools/${attendance.schoolVisibleId}/sessions`));
    const main = page.getByRole("main");
    await main.getByRole("combobox").filter({ hasText: "Show 10" }).click();
    await page.getByRole("option", { name: "Show 50" }).click();
    const sessionRow = main
      .getByRole("row")
      .filter({ has: page.getByRole("cell", { name: attendance.sessionLabel, exact: true }) });
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
