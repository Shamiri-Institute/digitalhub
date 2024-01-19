import { test } from "@playwright/test";

import { HomePage } from "#/tests/pages/home-page";
import { HubCoordinatorHomePage } from "#/tests/pages/hub-coordinator/home-page";
import { OperationsHomePage } from "#/tests/pages/operations/home-page";
import { newSession } from "#/tests/helpers";

test.describe("personnel can only access routes based on their role", () => {
  test.describe("supervisors", () => {
    test("can access unprefixed home page", async ({ browser }) => {
      const session = await newSession(browser, "supervisor");

      const page = HomePage.new(session);
      await page.visit();
      await page.isShown();
    });
  });

  test.describe("hub coordinators", () => {
    test("can access hub coordinator home page", async ({ browser }) => {
      const session = await newSession(browser, "hub-coordinator");

      const page = HubCoordinatorHomePage.new(session);
      await page.visit();
      await page.isShown();
    });
  });

  test.describe("operations", () => {
    test("can access operations home page", async ({ browser }) => {
      const session = await newSession(browser, "operations");

      const page = OperationsHomePage.new(session);
      await page.visit();
      await page.isShown();
    });
  });
});
