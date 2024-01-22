import { test } from "@playwright/test";

import { PersonnelFixtures } from "#/tests/helpers";
import { HomePage } from "#/tests/pages/home-page";
import { HubCoordinatorHomePage } from "#/tests/pages/hub-coordinator/home-page";
import { OperationsHomePage } from "#/tests/pages/operations/home-page";

test.describe("personnel can only access routes based on their role", () => {
  test.describe("supervisors", () => {
    test.use({ storageState: PersonnelFixtures.supervisor.stateFile });

    test("can access unprefixed home page", async ({ page }) => {
      const homePage = HomePage.new(page);
      await homePage.visit();
      await homePage.isShown();
    });

    test("cannot access hub coordinator home page", async ({ page }) => {
      const hcHomePage = HubCoordinatorHomePage.new(page);
      await hcHomePage.visit();

      const homePage = HomePage.new(page);
      await homePage.isShown();
    });

    test("cannot access operations home page", async ({ page }) => {
      const opsHomePage = OperationsHomePage.new(page);
      await opsHomePage.visit();

      const homePage = HomePage.new(page);
      await homePage.isShown();
    });
  });

  test.describe("hub coordinators", () => {
    test.use({ storageState: PersonnelFixtures.hubCoordinator.stateFile });

    test("can access hub coordinator home page", async ({ page }) => {
      const homePage = HubCoordinatorHomePage.new(page);
      await homePage.visit();
      await homePage.isShown();
    });
  });

  test.describe("operations", () => {
    test.use({ storageState: PersonnelFixtures.operations.stateFile });

    test("can access operations home page", async ({ page }) => {
      const homePage = OperationsHomePage.new(page);
      await homePage.visit();
      await homePage.isShown();
    });
  });
});
