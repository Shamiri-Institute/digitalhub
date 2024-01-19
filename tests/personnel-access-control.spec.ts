import { test } from "@playwright/test";

import { Fixtures } from "#/tests/helpers";
import { HomePage } from "#/tests/pages/home-page";
import { HubCoordinatorHomePage } from "#/tests/pages/hub-coordinator/home-page";
import { OperationsHomePage } from "#/tests/pages/operations/home-page";

test.describe("personnel can only access routes based on their role", () => {
  test.describe("supervisors", () => {
    test.use({ storageState: Fixtures.supervisor.stateFile });

    test("can access unprefixed home page", async ({ page }) => {
      const homePage = HomePage.new(page);
      await homePage.visit();
      await homePage.isShown();
    });
  });

  test.describe("hub coordinators", () => {
    test.use({ storageState: Fixtures.hubCoordinator.stateFile });

    test("can access hub coordinator home page", async ({ page }) => {
      const homePage = HubCoordinatorHomePage.new(page);
      await homePage.visit();
      await homePage.isShown();
    });
  });

  test.describe("operations", () => {
    test.use({ storageState: Fixtures.operations.stateFile });

    test("can access operations home page", async ({ page }) => {
      const homePage = OperationsHomePage.new(page);
      await homePage.visit();
      await homePage.isShown();
    });
  });
});
