import type { BrowserContext, Locator, Page } from "@playwright/test";
import { expect, test, type Undo } from "#/tests/fixtures";
import { format } from "date-fns";
import { eq, or } from "drizzle-orm";

import { db } from "#/db/client";
import type { ClinicalSessionLabel } from "#/db/enums";
import {
  clinicalCaseNotes,
  clinicalCaseReopening,
  clinicalCaseReview,
  clinicalCaseTermination,
  clinicalScreeningInfo,
  clinicalSessionAttendance,
  fellow,
  interventionSession,
  student,
  supervisor,
} from "#/db/schema";
import { objectId } from "#/lib/crypto";
import {
  createClinicalCase,
  emailForProfile,
  required,
  signInAs,
  signInWithEmail,
} from "#/tests/helpers";
import { getUrl, chooseRowAction, searchRows } from "#/tests/pages/helpers";

type Fixture = { profileId: string; hubId: string; email: string };

let owner: Fixture;
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
  required(first, "a supervisor with a hub");
  owner = first;

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

/** Fills the add-case form for a new student, all but its initial contact. */
async function fillCaseForNewStudent(page: Page, casePseudonym: string) {
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
  await dialog.getByRole("combobox").filter({ hasText: "Select session" }).click();
  await page.getByRole("option").first().click();
  return dialog;
}

async function chooseInitialContact(page: Page, dialog: Locator, initialContact: string) {
  await dialog.getByRole("combobox").filter({ hasText: "Select initial contact" }).click();
  await page.getByRole("option", { name: initialContact, exact: true }).click();
}

async function createCaseForNewStudent(page: Page, casePseudonym: string) {
  const dialog = await fillCaseForNewStudent(page, casePseudonym);
  await chooseInitialContact(page, dialog, "Student");
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(dialog).toBeHidden();
}

function caseOwners(casePseudonym: string) {
  return db.query.clinicalScreeningInfo.findFirst({
    where: (c, { eq }) => eq(c.pseudonym, casePseudonym),
    columns: { currentSupervisorId: true, clinicalLeadId: true },
  });
}

function initialReferrer(casePseudonym: string) {
  return db.query.clinicalScreeningInfo.findFirst({
    where: (c, { eq }) => eq(c.pseudonym, casePseudonym),
    columns: { initialReferredFromSpecified: true, initialReferredFrom: true },
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

test("a case first raised by a fellow names that fellow", async ({ page, context, undo }) => {
  const casePseudonym = `e2e-fellow-contact-${Date.now()}`;
  const ownerHub = await db.query.hub.findFirst({
    where: (h, { eq }) => eq(h.id, owner.hubId),
    columns: { hubName: true, implementerId: true },
  });
  required(ownerHub, "the supervisor's hub");
  const fellowId = objectId("fellow");
  const fellowName = `E2E first contact fellow ${Date.now()}`;
  await db.insert(fellow).values({
    id: fellowId,
    fellowName,
    hubId: owner.hubId,
    implementerId: ownerHub.implementerId,
  });
  undo(() => db.delete(fellow).where(eq(fellow.id, fellowId)));
  undo(() => deleteCase(casePseudonym));
  await signInWithEmail(context, owner.email);
  await page.goto(getUrl("/sc/clinical"));

  const dialog = await fillCaseForNewStudent(page, casePseudonym);
  await chooseInitialContact(page, dialog, "Fellow");
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(dialog.getByText("Select the fellow who made first contact")).toBeVisible();

  await dialog.getByRole("button", { name: "Select a hub..." }).click();
  await page.getByRole("option", { name: ownerHub.hubName, exact: true }).click();
  await dialog.getByRole("button", { name: "Select a fellow..." }).click();
  await page.getByPlaceholder("Search fellows...").fill(fellowName);
  await page.getByRole("option", { name: fellowName, exact: true }).click();
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(dialog).toBeHidden();

  await page.reload();
  await expect(await searchRows(page, casePseudonym)).toBeVisible();
  // No page names who first raised a case; the clinical charts only count them by kind.
  expect(await initialReferrer(casePseudonym)).toEqual({
    initialReferredFromSpecified: "fellow",
    initialReferredFrom: fellowId,
  });
});

test("a clinical lead's case first raised by a supervisor names that supervisor", async ({
  page,
  context,
  undo,
}) => {
  const casePseudonym = `e2e-supervisor-contact-${Date.now()}`;
  const leadHub = await db.query.hub.findFirst({
    where: (h, { eq }) => eq(h.id, clinicalLead.hubId),
    columns: { implementerId: true },
  });
  required(leadHub, "the clinical lead's hub");
  const supervisorId = objectId("sup");
  const supervisorName = `E2E first contact supervisor ${Date.now()}`;
  await db.insert(supervisor).values({
    id: supervisorId,
    supervisorName,
    hubId: clinicalLead.hubId,
    implementerId: leadHub.implementerId,
  });
  undo(() => db.delete(supervisor).where(eq(supervisor.id, supervisorId)));
  undo(() => deleteCase(casePseudonym));
  await signInWithEmail(context, clinicalLead.email);
  await page.goto(getUrl("/cl/clinical"));

  const dialog = await fillCaseForNewStudent(page, casePseudonym);
  await chooseInitialContact(page, dialog, "Supervisor");
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(dialog.getByText("Select the supervisor who made first contact")).toBeVisible();

  await dialog.getByRole("button", { name: "Select a supervisor..." }).click();
  await page.getByPlaceholder("Search supervisors...").fill(supervisorName);
  await page.getByRole("option", { name: supervisorName, exact: true }).click();
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(dialog).toBeHidden();

  await page.reload();
  await expect(await searchRows(page, casePseudonym)).toBeVisible();
  // No page names who first raised a case; the clinical charts only count them by kind.
  expect(await initialReferrer(casePseudonym)).toEqual({
    initialReferredFromSpecified: "supervisor",
    initialReferredFrom: supervisorId,
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

/**
 * Gives the fixture case a clinical session dated today, labelled so the test can pick it, and
 * queues its removal. Notes and terminations must name one of the case's sessions.
 */
async function addClinicalSession(
  sessionLabel: ClinicalSessionLabel,
  undo: Undo,
  marked: { date?: Date; attendanceStatus?: boolean } = {},
) {
  const [clinicalSession] = await db
    .insert(clinicalSessionAttendance)
    .values({
      caseId,
      session: sessionLabel,
      supervisorId: owner.profileId,
      attendanceStatus: marked.attendanceStatus ?? true,
      date: marked.date,
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

test("a case without notes shows its intake risk", async ({ page, context, undo }) => {
  await db
    .update(clinicalScreeningInfo)
    .set({ riskStatus: "High" })
    .where(eq(clinicalScreeningInfo.id, caseId));
  undo(() =>
    db
      .update(clinicalScreeningInfo)
      .set({ riskStatus: "No" })
      .where(eq(clinicalScreeningInfo.id, caseId)),
  );
  await signInWithEmail(context, owner.email);
  await page.goto(getUrl("/sc/clinical"));

  await expect(await searchRows(page, pseudonym)).toContainText(/high/i);
});

test("a case's risk names its source and date: intake until the first note, then the note", async ({
  page,
  context,
  undo,
}) => {
  const fixtureCase = await db.query.clinicalScreeningInfo.findFirst({
    where: (c, { eq }) => eq(c.id, caseId),
    columns: { createdAt: true },
  });
  required(fixtureCase, `case ${caseId} is gone`);
  const clinicalSessionId = await addClinicalSession("S2", undo);
  await signInWithEmail(context, owner.email);
  await page.goto(getUrl("/sc/clinical"));
  await expect(await searchRows(page, pseudonym)).toContainText(
    `Intake/triage · ${format(fixtureCase.createdAt, "dd MMM yyyy")}`,
  );

  const [note] = await db
    .insert(clinicalCaseNotes)
    .values({
      caseId,
      sessionId: clinicalSessionId,
      createdBy: await ownerUserId(),
      presentingIssues: "e2e",
      orsAssessment: 20,
      riskLevel: "high",
      necessaryConditions: "e2e",
      otherIntervention: "",
      interventionExplanation: "e2e",
      studentResponseExplanations: "e2e",
      followUpPlan: "INDIVIDUAL",
      followUpPlanExplanation: "e2e",
    })
    .returning({ createdAt: clinicalCaseNotes.createdAt });
  required(note, "could not insert the case note fixture");
  undo(() =>
    db.delete(clinicalCaseNotes).where(eq(clinicalCaseNotes.sessionId, clinicalSessionId)),
  );
  const noteSource = `S2 note · ${format(note.createdAt, "dd MMM yyyy")}`;

  await page.reload();
  await expect(await searchRows(page, pseudonym)).toContainText(noteSource);

  await context.clearCookies();
  await signInAs(context, "CLINICAL_TEAM");
  await page.goto(getUrl("/ct/clinical"));
  await expect(await searchRows(page, pseudonym)).toContainText(noteSource);
});

test("a supervisor writes case notes and reads them back after a reload", async ({
  page,
  context,
  undo,
}) => {
  const sessionLabel = "S1";
  const presentingIssues = `e2e-notes-${Date.now()} presenting issues`;
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
    await page.getByRole("option", { name: new RegExp(`^${sessionLabel} `) }).click();
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

  // A saved session's notes open read-only with the stored text, and the case takes their risk.
  await page.reload();
  await expect(await searchRows(page, pseudonym)).toContainText(/medium/i);
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

test("case notes typed and then cancelled are gone the next time the dialog opens", async ({
  page,
  context,
  undo,
}) => {
  const sessionLabel = "S2";
  await addClinicalSession(sessionLabel, undo);
  await signInWithEmail(context, owner.email);
  await page.goto(getUrl("/sc/clinical"));

  const dialog = page.getByRole("dialog", { name: "Case Notes" });
  await openCaseAction(page, pseudonym, "Case notes");
  await dialog.getByRole("combobox").filter({ hasText: "Select session" }).click();
  await page.getByRole("option", { name: new RegExp(`^${sessionLabel} `) }).click();
  await dialog.getByRole("textbox", { name: /Situation/ }).fill("Typed, then cancelled");
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(dialog).toBeHidden();

  // The case's actions menu stays open behind the dialog, so "Case notes" is clicked again there.
  await page.getByRole("menu").getByText("Case notes", { exact: true }).click();
  await expect(dialog.getByRole("combobox").filter({ hasText: "Select session" })).toBeVisible();
  await expect(dialog.getByRole("textbox", { name: /Situation/ })).toHaveValue("");
});
test("a supervisor terminates their case", async ({ page, context, undo }) => {
  const sessionLabel = "S3";
  const terminationReasonExplanation = `e2e-termination-${Date.now()} explanation`;
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
  const dialog = page.getByRole("dialog", { name: "Terminate Case" });
  await dialog.getByRole("combobox").filter({ hasText: "Select session" }).click();
  await page.getByRole("option", { name: new RegExp(`^${sessionLabel} `) }).click();
  await dialog.getByRole("combobox").filter({ hasText: "Student no-show" }).click();
  await page.getByRole("option", { name: "Student refused to return to sessions" }).click();
  await dialog
    .getByRole("textbox", { name: /Termination Explanation/ })
    .fill(terminationReasonExplanation);
  await dialog.getByRole("button", { name: "Terminate Case" }).click();
  await expect(dialog).toBeHidden();

  await page.reload();
  await expect(await searchRows(page, pseudonym)).toContainText("Terminated");

  // The clinical team reads the stored reason.
  await context.clearCookies();
  await signInAs(context, "CLINICAL_TEAM");
  await page.goto(getUrl("/ct/clinical"));
  await chooseRowAction(page, await searchRows(page, pseudonym), "View termination reasons");
  const reasons = page.getByRole("dialog");
  await expect(reasons).toContainText("Student refused to return to sessions");
  await expect(reasons).toContainText(terminationReasonExplanation);

  await context.clearCookies();
  await markReviewedAsHubClinicalLead(page, context, "Terminated", terminationReasonExplanation);
});

async function hubClinicalLeadEmail() {
  const hubLeads = await db.query.clinicalLead.findMany({
    where: (cl, { eq }) => eq(cl.assignedHubId, owner.hubId),
    columns: { id: true },
    orderBy: (cl, { asc }) => asc(cl.id),
  });
  let hubLeadEmail: string | undefined;
  for (const lead of hubLeads) {
    hubLeadEmail ??= (await emailForProfile(lead.id, "CLINICAL_LEAD")) ?? undefined;
  }
  required(hubLeadEmail, "no clinical lead in the supervisor's hub");
  return hubLeadEmail;
}

async function markReviewedAsHubClinicalLead(
  page: Page,
  context: BrowserContext,
  kind: "Terminated" | "Reopened",
  reason: string,
) {
  const hubLeadEmail = await hubClinicalLeadEmail();
  await signInWithEmail(context, hubLeadEmail);
  await page.goto(getUrl("/cl/clinical"));
  const review = page
    .getByRole("listitem")
    .filter({ hasText: pseudonym })
    .filter({ hasText: kind });
  await expect(review).toContainText(reason);
  await review.getByRole("button", { name: "Mark reviewed" }).click();
  await expect(page.getByText("Case marked reviewed").first()).toBeVisible();

  await page.reload();
  await expect(page.getByRole("heading", { name: /Cases to review/ })).toBeVisible();
  await expect(review).toHaveCount(0);

  // The reviewer comes from the session and no page shows it, so read it.
  const reviewer = await db.query.user.findFirst({
    where: (u, { eq }) => eq(u.email, hubLeadEmail),
    columns: { id: true },
  });
  const reviewedCaseReviews = await db
    .select({ reviewedBy: clinicalCaseReview.reviewedBy })
    .from(clinicalCaseReview)
    .leftJoin(
      clinicalCaseTermination,
      eq(clinicalCaseReview.terminationId, clinicalCaseTermination.id),
    )
    .leftJoin(clinicalCaseReopening, eq(clinicalCaseReview.reopeningId, clinicalCaseReopening.id))
    .where(
      or(eq(clinicalCaseTermination.caseId, caseId), eq(clinicalCaseReopening.caseId, caseId)),
    );
  expect(reviewedCaseReviews).toEqual([{ reviewedBy: reviewer?.id }]);
}

async function ownerUserId() {
  const ownerUser = await db.query.user.findFirst({
    where: (u, { eq }) => eq(u.email, owner.email),
    columns: { id: true },
  });
  required(ownerUser, "the supervisor has no user");
  return ownerUser.id;
}

async function openAttendanceRow(page: Page, sessionDate: Date) {
  await openCaseAction(page, pseudonym, "View attendance history");
  const history = page.getByRole("dialog", { name: "Clinical attendance history" });
  return history.getByRole("row").filter({ hasText: format(sessionDate, "dd MMM yyyy") });
}

async function markAttendance(page: Page, row: ReturnType<Page["getByRole"]>, mark: string) {
  await chooseRowAction(page, row, "Mark attendance");
  const dialog = page.getByRole("dialog", { name: "Mark Attendance" });
  await dialog.getByRole("radio", { name: mark }).click();
  await dialog.getByRole("button", { name: "Save changes" }).click();
}

test("a session label attended once cannot be marked attended again", async ({
  page,
  context,
  undo,
}) => {
  const attendedOn = new Date("2026-01-05T09:00:00Z");
  const missedOn = new Date("2026-01-12T09:00:00Z");
  await addClinicalSession("S4", undo, { date: attendedOn });
  await addClinicalSession("S4", undo, { date: missedOn, attendanceStatus: false });
  await signInWithEmail(context, owner.email);
  await page.goto(getUrl("/sc/clinical"));

  await markAttendance(page, await openAttendanceRow(page, missedOn), "Attended");
  await expect(page.getByText("S4 is already attended on this case").first()).toBeVisible();

  await page.reload();
  await expect(await openAttendanceRow(page, missedOn)).toContainText("Missed");
});

test("a session with case notes cannot be marked missed", async ({ page, context, undo }) => {
  const sessionDate = new Date("2026-01-19T09:00:00Z");
  const clinicalSessionId = await addClinicalSession("S1", undo, { date: sessionDate });
  await db.insert(clinicalCaseNotes).values({
    caseId,
    sessionId: clinicalSessionId,
    createdBy: await ownerUserId(),
    presentingIssues: "e2e",
    orsAssessment: 20,
    riskLevel: "no",
    necessaryConditions: "e2e",
    otherIntervention: "",
    interventionExplanation: "e2e",
    studentResponseExplanations: "e2e",
    followUpPlan: "INDIVIDUAL",
    followUpPlanExplanation: "e2e",
  });
  undo(() =>
    db.delete(clinicalCaseNotes).where(eq(clinicalCaseNotes.sessionId, clinicalSessionId)),
  );
  await signInWithEmail(context, owner.email);
  await page.goto(getUrl("/sc/clinical"));

  await markAttendance(page, await openAttendanceRow(page, sessionDate), "Missed");
  await expect(
    page.getByText("This session has case notes, so it stays attended").first(),
  ).toBeVisible();

  await page.reload();
  await expect(await openAttendanceRow(page, sessionDate)).toContainText("Attended");
});

test("a clinical lead reopens a terminated case with a reason and keeps its termination", async ({
  page,
  context,
  undo,
}) => {
  const hubLeadEmail = await hubClinicalLeadEmail();
  const clinicalSessionId = await addClinicalSession("S3", undo);
  const [termination] = await db
    .insert(clinicalCaseTermination)
    .values({
      caseId,
      sessionId: clinicalSessionId,
      terminationDate: new Date(),
      terminationReason: "Student refused to return to sessions",
      terminationReasonExplanation: "e2e",
      createdBy: await ownerUserId(),
    })
    .returning({ id: clinicalCaseTermination.id });
  required(termination, "could not insert the termination fixture");
  await db
    .update(clinicalScreeningInfo)
    .set({ caseStatus: "Terminated" })
    .where(eq(clinicalScreeningInfo.id, caseId));
  undo(
    () => db.delete(clinicalCaseTermination).where(eq(clinicalCaseTermination.id, termination.id)),
    () => db.delete(clinicalCaseReopening).where(eq(clinicalCaseReopening.caseId, caseId)),
    () =>
      db
        .update(clinicalScreeningInfo)
        .set({ caseStatus: "Active" })
        .where(eq(clinicalScreeningInfo.id, caseId)),
  );
  const reason = `e2e-reopen-${Date.now()}`;

  await signInWithEmail(context, hubLeadEmail);
  await page.goto(getUrl("/cl/clinical"));
  await openCaseAction(page, pseudonym, "Un-terminate case");
  const dialog = page.getByRole("dialog", { name: `Un-terminate case - ${pseudonym}` });
  await expect(dialog.getByRole("button", { name: "Confirm" })).toBeDisabled();
  await dialog.getByRole("textbox", { name: /Reason for reopening/ }).fill(reason);
  await dialog.getByRole("button", { name: "Confirm" }).click();
  await expect(dialog).toBeHidden();

  await page.reload();
  // The hub table has no status column; its actions menu offers un-terminating only a terminated case.
  await (await searchRows(page, pseudonym)).getByRole("cell").last().click();
  await expect(page.getByRole("menu")).toContainText("Actions", { ignoreCase: true });
  await expect(page.getByRole("menu").getByText("Un-terminate case")).toHaveCount(0);

  // No page shows the termination history, so read it.
  const reopening = await db.query.clinicalCaseReopening.findFirst({
    where: (r, { eq }) => eq(r.caseId, caseId),
    columns: { terminationId: true, reason: true },
  });
  expect(reopening).toEqual({ terminationId: termination.id, reason });
  const kept = await db.query.clinicalCaseTermination.findFirst({
    where: (t, { eq }) => eq(t.id, termination.id),
    columns: { id: true },
  });
  expect(kept).toEqual({ id: termination.id });

  await context.clearCookies();
  await markReviewedAsHubClinicalLead(page, context, "Reopened", reason);
});
