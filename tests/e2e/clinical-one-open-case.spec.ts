import type { Page } from "@playwright/test";
import { eq } from "drizzle-orm";

import { db } from "#/db/client";
import { clinicalScreeningInfo, interventionSession } from "#/db/schema";
import { expect, test } from "#/tests/fixtures";
import { createSupervisorCase, type HubTeam, pickHubTeam } from "#/tests/clinical-helpers";
import { required, signInWithEmail } from "#/tests/helpers";
import { getUrl, searchRows } from "#/tests/pages/helpers";

async function schoolName(team: HubTeam) {
  const school = await db.query.school.findFirst({
    where: (s, { eq }) => eq(s.id, team.schoolId),
    columns: { schoolName: true },
  });
  required(school, "the team's school");
  // "Add clinical case" asks for the session the case was flagged at, so the school needs one.
  const sessions = await db.$count(
    interventionSession,
    eq(interventionSession.schoolId, team.schoolId),
  );
  required(sessions, "a session at the team's school");
  return school.schoolName;
}

async function addCaseForExistingStudent(page: Page, school: string, studentName: string) {
  const pseudonym = `e2e-one-open-${Date.now()}`;
  await page.getByRole("button", { name: "New case" }).click();
  const dialog = page.getByRole("dialog", { name: "Add clinical case" });
  await dialog.getByRole("button", { name: "Select a school..." }).click();
  await page.getByPlaceholder("Search schools...").fill(school);
  await page.getByRole("option", { name: school, exact: true }).click();
  await dialog.getByRole("button", { name: "Select a student..." }).click();
  await page.getByPlaceholder("Search students...").fill(studentName);
  await page.getByRole("option", { name: studentName, exact: true }).click();
  await dialog.getByRole("textbox", { name: "Pseudonym", exact: true }).fill(pseudonym);
  await dialog.getByRole("combobox").filter({ hasText: "Select initial contact" }).click();
  await page.getByRole("option", { name: "Student", exact: true }).click();
  await dialog.getByRole("combobox").filter({ hasText: "Select session" }).click();
  await page.getByRole("option").first().click();
  await dialog.getByRole("button", { name: "Save" }).click();
  return { dialog, pseudonym };
}

test("a student gets a second case only once every earlier case is terminated", async ({
  page,
  context,
  undo,
}) => {
  const team = await pickHubTeam();
  const school = await schoolName(team);
  const firstCase = await createSupervisorCase(team, undo);

  await signInWithEmail(context, team.supervisorEmail);
  await page.goto(getUrl("/sc/clinical"));
  const refused = await addCaseForExistingStudent(page, school, firstCase.studentName);
  await expect(
    page.getByText("This student already has an open clinical case").first(),
  ).toBeVisible();
  await expect(refused.dialog).toBeVisible();

  await db
    .update(clinicalScreeningInfo)
    .set({ caseStatus: "Terminated" })
    .where(eq(clinicalScreeningInfo.id, firstCase.caseId));
  await page.reload();
  const accepted = await addCaseForExistingStudent(page, school, firstCase.studentName);
  // createSupervisorCase removes the student, so the new case must go first.
  undo(() =>
    db.delete(clinicalScreeningInfo).where(eq(clinicalScreeningInfo.pseudonym, accepted.pseudonym)),
  );
  await expect(accepted.dialog).toBeHidden();

  await page.reload();
  await expect(await searchRows(page, refused.pseudonym)).toHaveCount(0);
  await expect(await searchRows(page, accepted.pseudonym)).toContainText(/active/i);
});
