import { PersonnelFixtures } from "#/tests/helpers";
import HubCoordinatorSchoolsPage from "#/tests/pages/hub-coordinator/school-page";
import { test } from "@playwright/test";

test.use({ storageState: PersonnelFixtures.hubCoordinator.stateFile });
test.describe.configure({ mode: "parallel" });

test.describe("Hub Coordinator Schools View", () => {
  test("Hub Coordinator can view the /schools page", async ({ page }) => {
    // given
    const hubCoordinatorSchoolsPage = new HubCoordinatorSchoolsPage(page);
    // when
    await hubCoordinatorSchoolsPage.visit();
    // then
    await hubCoordinatorSchoolsPage.isShown();
    // graphs
    // table
    // weekly hub report
  });

  test("Hub Coordinator can submit a weekly hub report", async ({ page }) => {
    const hubCoordinatorSchoolsPage = new HubCoordinatorSchoolsPage(page);
    await hubCoordinatorSchoolsPage.visit();

    // click on the selector
  });
});
