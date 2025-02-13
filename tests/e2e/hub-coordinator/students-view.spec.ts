import { PersonnelFixtures } from "#/tests/helpers";
import HubCoordinatorStudentsPage from "#/tests/pages/hub-coordinator/students-page";
import { test } from "@playwright/test";

test.use({ storageState: PersonnelFixtures.hubCoordinator.stateFile });
test.describe.configure({ mode: "parallel" });

test("Hub coordinator can view the students page", async ({ page }) => {
  // given
  const hubCoordinatorStudentsPage = new HubCoordinatorStudentsPage(page)

  // when
  await hubCoordinatorStudentsPage.visit()

  // then
  await hubCoordinatorStudentsPage.isShown()
});
