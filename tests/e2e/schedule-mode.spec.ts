import { expect, test } from "@playwright/test";

import { PersonnelFixtures } from "#/tests/helpers";
import { getUrl } from "#/tests/pages/helpers";

const errorBoundary = "Oops! Something went wrong!";

test.describe("supervisor schedule mode from the URL", () => {
  test.use({ storageState: PersonnelFixtures.supervisor.stateFile });

  test("falls back to the month view when the URL asks for the table view", async ({ page }) => {
    await page.goto(getUrl("/sc/schedule?mode=table"));

    await expect(page.getByLabel("Select month view")).toHaveAttribute("data-state", "on");
    await expect(page.getByLabel("Select table view")).toHaveCount(0);
    await expect(page.getByText(errorBoundary)).toHaveCount(0);
  });

  test("falls back to the month view when the URL names an unknown mode", async ({ page }) => {
    await page.goto(getUrl("/sc/schedule?mode=bogus"));

    await expect(page.getByLabel("Select month view")).toHaveAttribute("data-state", "on");
    await expect(page.getByText(errorBoundary)).toHaveCount(0);
  });
});

test.describe("hub coordinator schedule mode from the URL", () => {
  test.use({ storageState: PersonnelFixtures.hubCoordinator.stateFile });

  test("renders the table view when the URL asks for it", async ({ page }) => {
    await page.goto(getUrl("/hc/schedule?mode=table"));

    await expect(page.getByLabel("Select table view")).toHaveAttribute("data-state", "on");
    await expect(page.getByLabel("Select Supervisors")).toBeVisible();
    await expect(page.getByText(errorBoundary)).toHaveCount(0);
  });
});
