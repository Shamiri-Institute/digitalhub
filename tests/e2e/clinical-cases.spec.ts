import type { Page } from "@playwright/test";
import { expect, test, type Undo } from "#/tests/fixtures";
import { eq } from "drizzle-orm";

import { db } from "#/db/client";
import {
  clinicalCaseNotes,
  clinicalCaseTermination,
  clinicalScreeningInfo,
  clinicalSessionAttendance,
  interventionSession,
  student,
} from "#/db/schema";
import { objectId } from "#/lib/crypto";
import { createClinicalCase, emailForProfile, signInWithEmail, required } from "#/tests/helpers";
import { getUrl, chooseRowAction, searchRows } from "#/tests/pages/helpers";

type Fixture = { profileId: string; hubId: string; email: string };

let owner: Fixture;
let outsider: Fixture;
let clinicalLead: Fixture;
let caseId: string;
let pseudonym: string;

test.describe.configure({ mode: "serial" });

let removeCase: () => Promise<void>;

test.beforeAll(async () => {
  const supervisors = await db.query.supervisor.findMany({
    where: (s, { isNotNull }) => isNotNull(s.hubId),
    columns: { id: true, hubId: true },
    orderBy: (s, { asc }) => asc(s.id),
  });
  const signable: Fixture[] = [];
  for (const s of supervisors) {
    const email = await emailForProfile(s.id, "SUPERVISOR");
    if (email && s.hubId) signable.push({ profileId: s.id, hubId: s.hubId, email });
  }
  const [first] = signable;
  const other = signable.find((s) => first && s.hubId !== first.hubId);
  if (!first || !other) throw new Error("seed the database first: no supervisors in two hubs");
  owner = first;
  outsider = other;

  const ownerSchool = await db.query.school.findFirst({
    where: (s, { eq }) => eq(s.hubId, owner.hubId),
    columns: { id: true },
    orderBy: (s, { asc }) => asc(s.id),
  });
  required(ownerSchool, "the supervisor's hub has no school");
  const ownCase = await createClinicalCase({
    schoolId: ownerSchool.id,
    currentSupervisorId: owner.profileId,
  });
  caseId = ownCase.caseId;
  pseudonym = ownCase.pseudonym;
  removeCase = ownCase.remove;

  const leads = await db.query.clinicalLead.findMany({
    where: (cl, { isNotNull }) => isNotNull(cl.assignedHubId),
    columns: { id: true, assignedHubId: true },
    orderBy: (cl, { asc }) => asc(cl.id),
  });
  for (const lead of leads) {
    const email = await emailForProfile(lead.id, "CLINICAL_LEAD");
    if (email && lead.assignedHubId) {
      clinicalLead = { profileId: lead.id, hubId: lead.assignedHubId, email };
      break;
    }
  }
  required(clinicalLead, "no clinical lead with a hub");
});

async function openCaseAction(page: Page, name: string, action: string) {
  await chooseRowAction(page, await searchRows(page, name), action);
}

async function createCaseForNewStudent(page: Page, casePseudonym: string) {
  await page.getByRole("button", { name: "New case" }).click();
  const dialog = page.getByRole("dialog", { name: "Add clinical case" });
  await dialog.getByRole("button", { name: "Select a school..." }).click();
  await page.getByRole("option").first().click();
  await dialog.getByRole("button", { name: "Add new student" }).click();
  await dialog
    .getByRole("textbox", { name: "Enter student name" })
    .fill(`${casePseudonym} student`);
  await dialog.getByRole("textbox", { name: "Pseudonym*" }).fill(casePseudonym);
  await dialog.getByRole("spinbutton", { name: "School Admission Number*" }).fill("9001");
  await dialog.getByRole("button", { name: "Pick a date" }).click();
  const picker = page.getByRole("dialog").last();
  await picker.getByRole("combobox", { name: "Choose the Year" }).selectOption("2010");
  await picker
    .getByRole("gridcell")
    .getByRole("button")
    .filter({ hasText: /^15$/ })
    .first()
    .click();
  await dialog.getByRole("combobox").filter({ hasText: "Select gender" }).click();
  await page.getByRole("option", { name: "Female", exact: true }).click();
  await dialog.getByRole("spinbutton", { name: "Grade/Form*" }).fill("2");
  await dialog.getByRole("textbox", { name: "Stream*" }).fill("B");
  await dialog.getByRole("combobox").filter({ hasText: "Select initial contact" }).click();
  await page.getByRole("option", { name: "Student", exact: true }).click();
  await dialog.getByRole("combobox").filter({ hasText: "Select session" }).click();
  await page.getByRole("option").first().click();
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(dialog).toBeHidden();
}

function caseOwners(casePseudonym: string) {
  return db.query.clinicalScreeningInfo.findFirst({
    where: (c, { eq }) => eq(c.pseudonym, casePseudonym),
    columns: { currentSupervisorId: true, clinicalLeadId: true },
  });
}

async function deleteCase(casePseudonym: string) {
  await db.delete(clinicalScreeningInfo).where(eq(clinicalScreeningInfo.pseudonym, casePseudonym));
  await db.delete(student).where(eq(student.studentName, `${casePseudonym} student`));
}

test.afterAll(async () => {
  await removeCase?.();
});

test("a supervisor's new case is listed as theirs", async ({ page, context, undo }) => {
  const casePseudonym = `e2e-sc-${Date.now()}`;
  await signInWithEmail(context, owner.email);
  await page.goto(getUrl("/sc/clinical"));
  undo(() => deleteCase(casePseudonym));

  await createCaseForNewStudent(page, casePseudonym);
  await page.reload();
  await expect(await searchRows(page, casePseudonym)).toContainText("ACTIVE", {
    ignoreCase: true,
  });
  // No page shows the lead of a supervisor's case; it must come from the session, not the form.
  expect(await caseOwners(casePseudonym)).toEqual({
    currentSupervisorId: owner.profileId,
    clinicalLeadId: null,
  });
});

test("a clinical lead's new case is assigned to them", async ({ page, context, undo }) => {
  const casePseudonym = `e2e-cl-${Date.now()}`;
  await signInWithEmail(context, clinicalLead.email);
  await page.goto(getUrl("/cl/clinical"));
  undo(() => deleteCase(casePseudonym));

  await createCaseForNewStudent(page, casePseudonym);
  await page.reload();
  await expect(await searchRows(page, casePseudonym)).toBeVisible();
  // No page shows the supervisor of a lead's case; it must come from the session, not the form.
  expect(await caseOwners(casePseudonym)).toEqual({
    currentSupervisorId: null,
    clinicalLeadId: clinicalLead.profileId,
  });
});

test("a supervisor opens a case for an existing student with a non-numeric admission number", async ({
  page,
  context,
  undo,
}) => {
  const casePseudonym = `e2e-existing-${Date.now()}`;
  const schoolWithSessions = await db.query.school.findFirst({
    where: (s, { and, eq, exists }) =>
      and(
        eq(s.hubId, owner.hubId),
        exists(
          db
            .select({ id: interventionSession.id })
            .from(interventionSession)
            .where(eq(interventionSession.schoolId, s.id)),
        ),
      ),
    columns: { id: true, schoolName: true },
    orderBy: (s, { asc }) => asc(s.id),
  });
  required(schoolWithSessions, "no school with sessions");
  const existingStudentName = `${casePseudonym} student`;
  await db.insert(student).values({
    id: objectId("stu"),
    visibleId: `E2E-${Date.now()}`,
    studentName: existingStudentName,
    schoolId: schoolWithSessions.id,
    admissionNumber: "ADM/0042-A",
  });
  undo(() => deleteCase(casePseudonym));

  await signInWithEmail(context, owner.email);
  await page.goto(getUrl("/sc/clinical"));
  await page.getByRole("button", { name: "New case" }).click();
  const dialog = page.getByRole("dialog", { name: "Add clinical case" });
  await dialog.getByRole("button", { name: "Select a school..." }).click();
  await page.getByPlaceholder("Search schools...").fill(schoolWithSessions.schoolName);
  await page.getByRole("option", { name: schoolWithSessions.schoolName, exact: true }).click();
  await dialog.getByRole("button", { name: "Select a student..." }).click();
  await page.getByPlaceholder("Search students...").fill(existingStudentName);
  await page.getByRole("option", { name: existingStudentName, exact: true }).click();
  await dialog.getByRole("textbox", { name: "Pseudonym*" }).fill(casePseudonym);
  await dialog.getByRole("combobox").filter({ hasText: "Select initial contact" }).click();
  await page.getByRole("option", { name: "Student", exact: true }).click();
  await dialog.getByRole("combobox").filter({ hasText: "Select session" }).click();
  await page.getByRole("option").first().click();
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(dialog).toBeHidden();

  await page.reload();
  await expect(await searchRows(page, casePseudonym)).toContainText("ACTIVE", {
    ignoreCase: true,
  });
});

test("a supervisor edits their case's student and the change survives a reload", async ({
  page,
  context,
  undo,
}) => {
  const ownCase = await db.query.clinicalScreeningInfo.findFirst({
    where: (c, { eq }) => eq(c.id, caseId),
    with: { student: true },
  });
  if (!ownCase) throw new Error(`case ${caseId} is gone`);
  const original = ownCase.student;
  const studentName = `E2E student ${Date.now()}`;
  await signInWithEmail(context, owner.email);
  await page.goto(getUrl("/sc/clinical"));
  undo(() =>
    db
      .update(student)
      .set({ studentName: original.studentName, form: original.form, stream: original.stream })
      .where(eq(student.id, original.id)),
  );

  await openCaseAction(page, pseudonym, "Edit student information");
  const dialog = page.getByRole("dialog", { name: "View/edit student information" });
  await dialog.getByRole("textbox", { name: "Student Name" }).fill(studentName);
  await dialog.getByRole("spinbutton", { name: "Grade/Form" }).fill("2");
  await dialog.getByRole("textbox", { name: "Stream" }).fill("B");
  await dialog.getByRole("button", { name: "Save Changes" }).click();
  await expect(dialog).toBeHidden();

  await page.reload();
  await openCaseAction(page, pseudonym, "Edit student information");
  await expect(dialog.getByRole("textbox", { name: "Student Name" })).toHaveValue(studentName);
});

test("a supervisor moves their case to follow-up", async ({ page, context, undo }) => {
  await signInWithEmail(context, owner.email);
  await page.goto(getUrl("/sc/clinical"));
  undo(() =>
    db
      .update(clinicalScreeningInfo)
      .set({ caseStatus: "Active" })
      .where(eq(clinicalScreeningInfo.id, caseId)),
  );

  await openCaseAction(page, pseudonym, "Follow up");
  const dialog = page.getByRole("dialog", { name: "Trigger Follow Up" });
  await dialog.getByRole("button", { name: "Confirm" }).click();
  await expect(dialog).toBeHidden();

  await page.reload();
  await expect(await searchRows(page, pseudonym)).toContainText("FollowUp");
});

test("a supervisor in another hub does not see the case", async ({ page, context }) => {
  await signInWithEmail(context, outsider.email);
  await page.goto(getUrl("/sc/clinical"));

  await expect(page.getByRole("button", { name: "New case" })).toBeVisible();
  await expect(await searchRows(page, pseudonym)).toHaveCount(0);
});

/**
 * Gives the fixture case a clinical session dated today, labelled so the test can pick it, and
 * queues its removal. Notes and terminations must name one of the case's sessions.
 */
async function addClinicalSession(sessionLabel: string, undo: Undo) {
  const [clinicalSession] = await db
    .insert(clinicalSessionAttendance)
    .values({
      caseId,
      session: sessionLabel,
      supervisorId: owner.profileId,
      attendanceStatus: true,
    })
    .returning({ id: clinicalSessionAttendance.id });
  if (!clinicalSession) throw new Error("could not insert the clinical session fixture");
  undo(() =>
    db
      .delete(clinicalSessionAttendance)
      .where(eq(clinicalSessionAttendance.id, clinicalSession.id)),
  );
  return clinicalSession.id;
}

test("a supervisor writes case notes and reads them back after a reload", async ({
  page,
  context,
  undo,
}) => {
  const sessionLabel = `e2e-notes-${Date.now()}`;
  const presentingIssues = `${sessionLabel} presenting issues`;
  const clinicalSessionId = await addClinicalSession(sessionLabel, undo);
  undo(() =>
    db.delete(clinicalCaseNotes).where(eq(clinicalCaseNotes.sessionId, clinicalSessionId)),
  );
  await signInWithEmail(context, owner.email);
  await page.goto(getUrl("/sc/clinical"));

  const dialog = page.getByRole("dialog", { name: "Case Notes" });
  async function openNotesForSession() {
    await openCaseAction(page, pseudonym, "Case notes");
    await dialog.getByRole("combobox").filter({ hasText: "Select session" }).click();
    await page.getByRole("option", { name: new RegExp(sessionLabel) }).click();
  }

  await openNotesForSession();
  await dialog.getByRole("textbox", { name: /Situation/ }).fill(presentingIssues);
  await dialog.getByRole("spinbutton", { name: "ORS Assessment" }).fill("27");
  await dialog.getByRole("checkbox", { name: /^medium$/i }).click();
  await dialog.getByRole("textbox", { name: "Necessary Conditions" }).fill("Quiet room");
  await dialog.getByRole("checkbox", { name: "Interpersonal Therapy" }).click();
  await dialog.getByRole("textbox", { name: /^Intervention:/ }).fill("Role play");
  await dialog.getByRole("textbox", { name: /Student Behavioural/ }).fill("Calmer");
  await dialog.getByRole("checkbox", { name: "Group Session" }).click();
  await dialog.getByRole("textbox", { name: /^Explanation/ }).fill("Join the next group");
  await dialog.getByRole("button", { name: "Submit" }).click();
  await expect(dialog).toBeHidden();

  await page.reload();
  await openNotesForSession();
  await expect(dialog.getByRole("textbox", { name: /Situation/ })).toHaveValue(presentingIssues);
  await expect(dialog.getByRole("button", { name: "Submit" })).toBeHidden();
  await expect(dialog.getByRole("spinbutton", { name: "ORS Assessment" })).toHaveValue("27");
  await expect(dialog.getByRole("checkbox", { name: /^medium$/i })).toBeChecked();
  await expect(dialog.getByRole("textbox", { name: "Necessary Conditions" })).toHaveValue(
    "Quiet room",
  );
  await expect(dialog.getByRole("checkbox", { name: "Interpersonal Therapy" })).toBeChecked();
  await expect(dialog.getByRole("textbox", { name: /^Intervention:/ })).toHaveValue("Role play");
  await expect(dialog.getByRole("textbox", { name: /Student Behavioural/ })).toHaveValue("Calmer");
  await expect(dialog.getByRole("checkbox", { name: "Group Session" })).toBeChecked();
  await expect(dialog.getByRole("textbox", { name: /^Explanation/ })).toHaveValue(
    "Join the next group",
  );
});

test("a supervisor terminates their case", async ({ page, context, undo }) => {
  const sessionLabel = `e2e-termination-${Date.now()}`;
  const terminationReasonExplanation = `${sessionLabel} explanation`;
  const clinicalSessionId = await addClinicalSession(sessionLabel, undo);
  undo(
    () =>
      db
        .delete(clinicalCaseTermination)
        .where(eq(clinicalCaseTermination.sessionId, clinicalSessionId)),
    () =>
      db
        .update(clinicalScreeningInfo)
        .set({ caseStatus: "Active" })
        .where(eq(clinicalScreeningInfo.id, caseId)),
  );
  await signInWithEmail(context, owner.email);
  await page.goto(getUrl("/sc/clinical"));

  await openCaseAction(page, pseudonym, "Terminate case");
  const dialog = page
    .getByRole("dialog")
    .filter({ has: page.getByRole("heading", { name: "Terminate Case" }) });
  await dialog.getByRole("combobox").filter({ hasText: "Select session" }).click();
  await page.getByRole("option", { name: new RegExp(sessionLabel) }).click();
  await dialog.getByRole("combobox").filter({ hasText: "Student no-show" }).click();
  await page.getByRole("option", { name: "Student refused to return to sessions" }).click();
  await dialog
    .getByRole("textbox", { name: /Termination Explanation/ })
    .fill(terminationReasonExplanation);
  await dialog.getByRole("button", { name: "Terminate Case" }).click();
  await expect(dialog).toBeHidden();

  await page.reload();
  await expect(await searchRows(page, pseudonym)).toContainText("Terminated");

  // No page shows the termination reason, so read the stored one.
  const termination = await db.query.clinicalCaseTermination.findFirst({
    where: (t, { eq }) => eq(t.sessionId, clinicalSessionId),
    columns: { caseId: true, terminationReason: true, terminationReasonExplanation: true },
  });
  expect(termination).toEqual({
    caseId,
    terminationReason: "Student refused to return to sessions",
    terminationReasonExplanation,
  });
});
