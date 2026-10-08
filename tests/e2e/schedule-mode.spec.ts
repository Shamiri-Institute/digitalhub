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

  test("back and forward show the view that the URL names", async ({ page }) => {
    await page.goto(getUrl("/sc/schedule"));
    await page.getByLabel("Select week view").click();
    await expect(page).toHaveURL(/mode=week/);
    await page.getByLabel("Select list view").click();
    await expect(page).toHaveURL(/mode=list/);

    await page.goBack();
    await expect(page).toHaveURL(/mode=week/);
    await expect(page.getByLabel("Select week view")).toHaveAttribute("data-state", "on");

    await page.goForward();
    await expect(page).toHaveURL(/mode=list/);
    await expect(page.getByLabel("Select list view")).toHaveAttribute("data-state", "on");
  });

  test("the visible dates are in the URL, so a reload keeps them", async ({ page }) => {
    await page.goto(getUrl("/sc/schedule?mode=week"));
    const title = page.getByRole("heading", { level: 3 });
    const thisWeek = await title.innerText();

    await page.getByRole("button", { name: "Next", exact: true }).click();
    await expect(title).not.toHaveText(thisWeek);
    await expect(page).toHaveURL(/date=\d{4}-\d{2}-\d{2}/);
    const nextWeek = await title.innerText();

    await page.reload();
    await expect(title).toHaveText(nextWeek);
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
