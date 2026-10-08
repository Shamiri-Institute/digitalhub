import { expect, test } from "@playwright/test";
import { eq } from "drizzle-orm";

import { db } from "#/db/client";
import { school, weeklyHubReport } from "#/db/schema";
import { PersonnelFixtures } from "#/tests/helpers";
import HubCoordinatorSchoolsPage from "#/tests/pages/hub-coordinator/school-page";

test.use({ storageState: PersonnelFixtures.hubCoordinator.stateFile });
test.describe.configure({ mode: "parallel" });

const recommendations = `E2E weekly hub report ${Date.now()}`;
let originalSchool:
  | Pick<typeof school.$inferSelect, "id" | "numbersExpected" | "boardingDay">
  | undefined;

// Cleanup runs in afterAll, not in a finally block: when a test times out, Playwright abandons
// its body but still runs the hooks.
test.afterAll(async () => {
  await db.delete(weeklyHubReport).where(eq(weeklyHubReport.recommendations, recommendations));
  if (originalSchool) {
    const { id, ...originalFields } = originalSchool;
    await db.update(school).set(originalFields).where(eq(school.id, id));
  }
});

test("Hub Coordinator can view the /schools page", async ({ page }) => {
  // given
  const hubCoordinatorSchoolsPage = new HubCoordinatorSchoolsPage(page);
  // when
  await hubCoordinatorSchoolsPage.visit();
  // then
  await hubCoordinatorSchoolsPage.isShown();
  await expect(page.getByRole("button", { name: "Weekly Hub Report" })).toBeVisible();

  const mainTag = page.getByRole("main");
  await expect(page.locator("h2")).toContainText("Schools");
  await expect(mainTag).toContainText("Session progress");
  await expect(mainTag).toContainText("Drop out reasons");
  await expect(mainTag).toContainText("School information completion");
  await expect(mainTag).toContainText("Ratings");
  await expect(page.locator("main")).toContainText("Edit columns");
});

test("Hub Coordinator can submit a weekly hub report", async ({ page }) => {
  // given
  const hubCoordinatorSchoolsPage = new HubCoordinatorSchoolsPage(page);
  await hubCoordinatorSchoolsPage.visit();
  const data = {
    schoolRelatedIssuesAndObservations: "The school is ok",
    schoolRelatedIssuesAndObservationRating: 2,
    supervisorRelatedIssuesAndObservations: "the school is awesome",
    supervisorRelatedIssuesAndObservationsRating: 3,
    fellowRelatedIssuesAndObservations: "The fellows have been ok",
    fellowRelatedIssuesAndObservationsRating: 1,
    hubRelatedIssuesAndObservations: "There have been no issues",
    hubRelatedIssuesAndObservationsRating: 4,
    successes: "It has generally been successful",
    challenges: "I don't have any challenges to report",
    recommendations,
  };

  // when
  await page.getByRole("button", { name: "Weekly Hub Report" }).click();
  await expect(page.getByTestId("weekly-hub-report-dialog")).toBeVisible();

  await page.getByRole("combobox", { name: "Select week" }).click();
  await page.getByRole("option", { name: "Week 1" }).click();
  await page
    .locator("label")
    .filter({ hasText: "Hub Related Issues and" })
    .locator("path")
    .nth(1)
    .click();
  await page
    .getByRole("textbox", { name: "Hub Related Issues and" })
    .fill(data.hubRelatedIssuesAndObservations);
  await page
    .locator("label")
    .filter({ hasText: "School Related Issues and" })
    .locator("path")
    .nth(3)
    .click();
  await page
    .getByRole("textbox", { name: "School Related Issues and" })
    .fill(data.schoolRelatedIssuesAndObservations);
  await page
    .locator("label")
    .filter({ hasText: "Supervisor Related Issues and" })
    .locator("path")
    .nth(2)
    .click();
  await page
    .getByRole("textbox", { name: "Supervisor Related Issues and" })
    .fill(data.supervisorRelatedIssuesAndObservations);
  await page
    .locator("label")
    .filter({ hasText: "Fellow Related Issues and" })
    .getByRole("img")
    .nth(4)
    .click();
  //await page.getByRole('textbox', { name: 'Fellow Related Issues and' }).click();
  await page
    .getByRole("textbox", { name: "Fellow Related Issues and" })
    .fill(data.fellowRelatedIssuesAndObservations);
  //await page.getByRole('textbox', { name: 'Successes' }).click();
  await page.getByRole("textbox", { name: "Successes" }).fill(data.successes);
  //await page.getByRole('textbox', { name: 'Challenges' }).click();
  await page.getByRole("textbox", { name: "Challenges" }).fill(data.challenges);
  //await page.getByRole('textbox', { name: 'Recommendations' }).click();
  await page.getByRole("textbox", { name: "Recommendations" }).fill(data.recommendations);
  await page.getByRole("button", { name: "Submit" }).click();

  // then
  // dialog only dismissed upon successful entry
  await expect(page.getByTestId("weekly-hub-report-dialog")).not.toBeVisible();

  // No page lists weekly hub reports yet, so the test reads the saved report from the database.
  // The hub and the author must come from the session, not from the form.
  const coordinatorMembership = await db.query.user.findFirst({
    where: (u, { eq }) => eq(u.email, PersonnelFixtures.hubCoordinator.email),
    columns: {},
    with: { memberships: { columns: { identifier: true, role: true } } },
  });
  const coordinatorId = coordinatorMembership?.memberships.find(
    (m) => m.role === "HUB_COORDINATOR",
  )?.identifier;
  if (!coordinatorId) throw new Error("the hub coordinator fixture has no membership");
  const coordinator = await db.query.hubCoordinator.findFirst({
    where: (hc, { eq }) => eq(hc.id, coordinatorId),
    columns: { id: true, assignedHubId: true },
  });

  const savedReport = await db.query.weeklyHubReport.findFirst({
    where: (r, { eq }) => eq(r.recommendations, recommendations),
    columns: { hubId: true, submittedBy: true, successes: true },
  });
  expect(savedReport).toEqual({
    hubId: coordinator?.assignedHubId,
    submittedBy: coordinator?.id,
    successes: data.successes,
  });
});

test("Hub Coordinator edits a school in one dialog", async ({ page }) => {
  const hubCoordinatorSchoolsPage = new HubCoordinatorSchoolsPage(page);
  await hubCoordinatorSchoolsPage.visit();
  const schoolName = await page.getByRole("row").nth(1).getByRole("cell").first().innerText();
  const schoolRow = page.getByRole("row").filter({ hasText: schoolName });
  originalSchool = await db.query.school.findFirst({
    where: (s, { eq }) => eq(s.schoolName, schoolName),
    columns: { id: true, numbersExpected: true, boardingDay: true },
  });
  const newNumbersExpected = String((originalSchool?.numbersExpected ?? 0) + 1);

  await schoolRow.getByRole("cell").last().click();
  await page.getByRole("menuitem", { name: "Edit school information" }).click();

  await expect(
    page.locator('[role="dialog"]').filter({ hasText: "Edit school information" }),
  ).toHaveCount(1);
  const editDialog = page.getByRole("dialog", { name: "Edit school information" });
  await editDialog.getByLabel("Expected no. of students").fill(newNumbersExpected);
  await editDialog.getByRole("combobox", { name: "School boarding status" }).click();
  await page.getByRole("option", { name: "Day", exact: true }).click();
  await editDialog.getByRole("button", { name: "Save Changes" }).click();

  await expect(editDialog).toBeHidden();
  await expect(schoolRow).toContainText(newNumbersExpected);
  await page.reload();
  await expect(schoolRow).toContainText(newNumbersExpected);
});
