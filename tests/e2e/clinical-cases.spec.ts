import { expect, type Page, test } from "@playwright/test";
import { eq } from "drizzle-orm";

import { db } from "#/db/client";
import { clinicalScreeningInfo, student } from "#/db/schema";
import { emailForProfile, signInWithEmail } from "#/tests/helpers";
import { getUrl } from "#/tests/pages/helpers";

/**
 * A supervisor works on the clinical cases they hold, through the UI. Each test saves, reloads and
 * checks what the page shows; the database is read only to find fixtures and to clean up.
 */

type Fixture = { profileId: string; hubId: string; email: string };

let owner: Fixture;
let outsider: Fixture;
let clinicalLead: Fixture;
let caseId: string;
let pseudonym: string;

// The dev server compiles each page on first use, which can take longer than the default.
test.describe.configure({ mode: "serial", timeout: 3 * 60 * 1000 });

test.beforeAll(async () => {
  const supervisors = await db.query.supervisor.findMany({
    columns: { id: true, hubId: true },
    with: {
      clinicalScreeningCases: {
        where: (c, { eq }) => eq(c.caseStatus, "Active"),
        columns: { id: true, pseudonym: true },
        orderBy: (c, { asc }) => asc(c.id),
      },
    },
    orderBy: (s, { asc }) => asc(s.id),
  });

  const signable: (Fixture & { cases: { id: string; pseudonym: string | null }[] })[] = [];
  for (const s of supervisors) {
    const email = s.hubId ? await emailForProfile(s.id, "SUPERVISOR") : null;
    if (email && s.hubId) {
      signable.push({
        profileId: s.id,
        hubId: s.hubId,
        email,
        cases: s.clinicalScreeningCases,
      });
    }
  }
  const withCase = signable.find((s) => s.cases.some((c) => c.pseudonym));
  const ownCase = withCase?.cases.find((c) => c.pseudonym);
  const other = signable.find((s) => withCase && s.hubId !== withCase.hubId);
  if (!withCase || !ownCase?.pseudonym || !other) {
    throw new Error("seed the database first: no supervisor with an active case and an outsider");
  }
  owner = withCase;
  outsider = other;
  caseId = ownCase.id;
  pseudonym = ownCase.pseudonym;

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
  if (!clinicalLead) throw new Error("seed the database first: no clinical lead with a hub");
});

function caseRow(page: Page, name: string) {
  return page.getByRole("row").filter({ hasText: name });
}

async function openCaseAction(page: Page, name: string, action: string) {
  await caseRow(page, name).getByRole("cell").last().click();
  await page.getByRole("menu").getByText(action, { exact: true }).click();
}

/** Fills the "Add clinical case" dialog for a new student at the first school offered. */
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

async function deleteCase(casePseudonym: string) {
  const deleted = await db
    .delete(clinicalScreeningInfo)
    .where(eq(clinicalScreeningInfo.pseudonym, casePseudonym))
    .returning({ studentId: clinicalScreeningInfo.studentId });
  for (const { studentId } of deleted) {
    await db.delete(student).where(eq(student.id, studentId));
  }
}

test("a supervisor's new case is listed as theirs", async ({ page, context }) => {
  const casePseudonym = `e2e-sc-${Date.now()}`;
  await signInWithEmail(context, owner.email);
  await page.goto(getUrl("/sc/clinical"));

  try {
    await createCaseForNewStudent(page, casePseudonym);
    await page.reload();
    await expect(caseRow(page, casePseudonym)).toContainText("ACTIVE", { ignoreCase: true });

    // The creator comes from the session: the case belongs to this supervisor and no lead.
    const created = await db.query.clinicalScreeningInfo.findFirst({
      where: (c, { eq }) => eq(c.pseudonym, casePseudonym),
      columns: { currentSupervisorId: true, clinicalLeadId: true },
    });
    expect(created).toEqual({ currentSupervisorId: owner.profileId, clinicalLeadId: null });
  } finally {
    await deleteCase(casePseudonym);
  }
});

test("a clinical lead's new case is assigned to them", async ({ page, context }) => {
  const casePseudonym = `e2e-cl-${Date.now()}`;
  await signInWithEmail(context, clinicalLead.email);
  await page.goto(getUrl("/cl/clinical"));

  try {
    await createCaseForNewStudent(page, casePseudonym);
    await page.reload();
    await expect(caseRow(page, casePseudonym)).toBeVisible();

    const created = await db.query.clinicalScreeningInfo.findFirst({
      where: (c, { eq }) => eq(c.pseudonym, casePseudonym),
      columns: { currentSupervisorId: true, clinicalLeadId: true },
    });
    expect(created).toEqual({ currentSupervisorId: null, clinicalLeadId: clinicalLead.profileId });
  } finally {
    await deleteCase(casePseudonym);
  }
});

test("a supervisor edits their case's student and the change survives a reload", async ({
  page,
  context,
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

  try {
    await openCaseAction(page, pseudonym, "Edit student information");
    // This dialog's heading is not linked to it, so it has no accessible name.
    const dialog = page
      .getByRole("dialog")
      .filter({ has: page.getByRole("heading", { name: "View/edit student information" }) });
    await dialog.getByRole("textbox", { name: "Student Name" }).fill(studentName);
    await dialog.getByRole("spinbutton", { name: "Grade/Form" }).fill("2");
    await dialog.getByRole("textbox", { name: "Stream" }).fill("B");
    await dialog.getByRole("button", { name: "Save Changes" }).click();
    await expect(dialog).toBeHidden();

    await page.reload();
    await openCaseAction(page, pseudonym, "Edit student information");
    await expect(dialog.getByRole("textbox", { name: "Student Name" })).toHaveValue(studentName);
  } finally {
    await db
      .update(student)
      .set({ studentName: original.studentName, form: original.form, stream: original.stream })
      .where(eq(student.id, original.id));
  }
});

test("a supervisor moves their case to follow-up", async ({ page, context }) => {
  await signInWithEmail(context, owner.email);
  await page.goto(getUrl("/sc/clinical"));

  try {
    await openCaseAction(page, pseudonym, "Follow up");
    const dialog = page.getByRole("dialog", { name: "Trigger Follow Up" });
    await dialog.getByRole("button", { name: "Confirm" }).click();
    await expect(dialog).toBeHidden();

    await page.reload();
    await expect(caseRow(page, pseudonym)).toContainText("FollowUp");
  } finally {
    await db
      .update(clinicalScreeningInfo)
      .set({ caseStatus: "Active" })
      .where(eq(clinicalScreeningInfo.id, caseId));
  }
});

test("a supervisor in another hub does not see the case", async ({ page, context }) => {
  await signInWithEmail(context, outsider.email);
  await page.goto(getUrl("/sc/clinical"));

  await expect(page.getByRole("button", { name: "New case" })).toBeVisible();
  await expect(caseRow(page, pseudonym)).toHaveCount(0);
});
