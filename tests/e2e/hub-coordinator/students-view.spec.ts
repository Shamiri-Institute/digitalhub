import { expect, test } from "@playwright/test";
import { PersonnelFixtures } from "#/tests/helpers";
import HubCoordinatorStudentsPage from "#/tests/pages/hub-coordinator/students-page";

test.use({ storageState: PersonnelFixtures.hubCoordinator.stateFile });
test.describe.configure({ mode: "parallel" });

test("Hub coordinator can view the students page", async ({ page }) => {
  // given
  const hubCoordinatorStudentsPage = new HubCoordinatorStudentsPage(page);

  // when
  await hubCoordinatorStudentsPage.visit();

  // then
  await hubCoordinatorStudentsPage.isShown();
  const mainPage = page.getByRole("main");
  await expect(mainPage).toContainText("Total no. of students");
  await expect(mainPage).toContainText("Count of group sessions");
  await expect(mainPage).toContainText("No. of clinical cases");
  await expect(mainPage).toContainText("No. of clinical sessions");
  await expect(mainPage).toContainText("Attendance");
  await expect(mainPage).toContainText("Drop-out reasons");
  await expect(mainPage).toContainText("Student information completion");
  await expect(mainPage).toContainText("Student group ratings");
  await expect(mainPage).toContainText("Clinical cases by case status");
  await expect(mainPage).toContainText("Clinical sessions");
  await expect(mainPage).toContainText("Clinical cases by supervisor");
  await expect(mainPage).toContainText("Clinical cases by initial contact");
  await expect(mainPage).toContainText("Students grouped by form");
  await expect(mainPage).toContainText("Students grouped by age");
  await expect(mainPage).toContainText("Students grouped by gender");
});
