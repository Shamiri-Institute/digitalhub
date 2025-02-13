import { PersonnelFixtures } from "#/tests/helpers";
import HubCoordinatorStudentsPage from "#/tests/pages/hub-coordinator/students-page";
import { expect, test } from "@playwright/test";

test.use({ storageState: PersonnelFixtures.hubCoordinator.stateFile });
test.describe.configure({ mode: "parallel" });

test("Hub coordinator can view the students page", async ({ page }) => {
  // given
  const hubCoordinatorStudentsPage = new HubCoordinatorStudentsPage(page);

  // when
  await hubCoordinatorStudentsPage.visit();

  // then
  await hubCoordinatorStudentsPage.isShown();
  await expect(page.getByRole("main")).toContainText("Total no. of students");
  await expect(page.getByRole("main")).toContainText("Count of group sessions");
  await expect(page.getByRole("main")).toContainText("No. of clinical cases");
  await expect(page.getByRole("main")).toContainText(
    "No. of clinical sessions",
  );
  await expect(page.getByRole("main")).toContainText("Attendance");
  await expect(page.getByRole("main")).toContainText("Drop-out reasons");
  await expect(page.getByRole("main")).toContainText(
    "Student information completion",
  );
  await expect(page.getByRole("main")).toContainText("Student group ratings");
  await expect(page.getByRole("main")).toContainText(
    "Clinical cases by case status",
  );
  await expect(page.getByRole("main")).toContainText("Clinical sessions");
  await expect(page.getByRole("main")).toContainText(
    "Clinical cases by supervisor",
  );
  await expect(page.getByRole("main")).toContainText(
    "Clinical cases by initial contact",
  );
  await expect(page.getByRole("main")).toContainText(
    "Students grouped by form",
  );
  await expect(page.getByRole("main")).toContainText("Students grouped by age");
  await expect(page.getByRole("main")).toContainText(
    "Students grouped by gender",
  );
});
