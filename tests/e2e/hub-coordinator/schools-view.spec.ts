import { PersonnelFixtures } from "#/tests/helpers";
import HubCoordinatorSchoolsPage from "#/tests/pages/hub-coordinator/school-page";
import { expect, test } from "@playwright/test";

test.use({ storageState: PersonnelFixtures.hubCoordinator.stateFile });
test.describe.configure({ mode: "parallel" });

test("Hub Coordinator can view the /schools page", async ({ page }) => {
  // given
  const hubCoordinatorSchoolsPage = new HubCoordinatorSchoolsPage(page);
  // when
  await hubCoordinatorSchoolsPage.visit();
  // then
  await hubCoordinatorSchoolsPage.isShown();
  await expect(
    page.getByRole("button", { name: "Weekly Hub Report" }),
  ).toBeVisible();

  const mainTag = page.getByRole("main");
  await expect(page.locator("h2")).toContainText("Schools");
  await expect(mainTag).toContainText("Session progress");
  await expect(mainTag).toContainText("Drop out reasons");
  await expect(mainTag).toContainText("School information completion");
  await expect(mainTag).toContainText("Ratings");
  await expect(mainTag).toContainText("Download schools CSV template");
  await expect(mainTag).toContainText("Upload schools CSV");
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
    recommendations: "I would recommend continued behaviour",
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
  await page
    .getByRole("textbox", { name: "Recommendations" })
    .fill(data.recommendations);
  await page.getByRole("button", { name: "Submit" }).click();

  // then
  // dialog only dismissed upon successful entry
  await expect(page.getByTestId("weekly-hub-report-dialog")).not.toBeVisible();
});
