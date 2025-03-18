import { PersonnelFixtures } from "#/tests/helpers";
import { SupervisorHomePage } from "#/tests/pages/supervisors/home-page";
import { expect, test } from "@playwright/test";

test.describe("Fellow Attendance Flow", () => {
  test.use({ storageState: PersonnelFixtures.supervisor.stateFile });
  test.describe.configure({ mode: "parallel" });

  test("should open fellow attendance dialog from month view and mark attendance", async ({
    page,
  }) => {
    const supervisorHomePage = new SupervisorHomePage(page);
    await supervisorHomePage.visit();
    await supervisorHomePage.isShown();

    // Wait for the "Schedule a session" button to be visible (indicates sessions are loaded)
    await expect(page.getByText("Schedule a session")).toBeVisible();

    // Now wait for sessions to be loaded
    const sessionList = page.getByTestId("session-item");
    const count = await sessionList.count();
    await expect(count).toBeGreaterThan(0);

    // Click the first available session
    const firstSession = sessionList.first();
    await expect(firstSession).toBeVisible();
    await firstSession.click();

    // Click the "Mark fellow attendance" option in the dropdown
    await page
      .getByRole("menuitem", { name: "Mark fellow attendance" })
      .click();

    // Verify the fellow attendance dialog opens
    await expect(page.getByTestId("fellow-attendance-dialog")).toBeVisible();

    // Find the row containing "King LLC" and its associated menu trigger
    const row = page.locator("tr", { has: page.getByText("King LLC") }).first();
    await expect(row).toBeVisible();

    // Click the three dots menu trigger button in this row
    const menuTrigger = row.locator('[aria-haspopup="menu"]').first();
    await menuTrigger.click();

    // Click "Mark attendance" in the dropdown menu
    await page.getByRole("menuitem", { name: "Mark attendance" }).click();

    // Verify the attendance dialog is shown
    await expect(page.getByTestId("mark-attendance-dialog")).toBeVisible();

    // Select "Attended" option using the id
    await page.locator("#mark_attended").check();

    // Click the "Submit" button to confirm attendance
    await page.getByRole("button", { name: "Submit" }).click();

    // // Wait for and check the toast message indicating success
    // const toastMessage = page.getByText('Successfully marked attendance');
    // await expect(toastMessage).toBeVisible({ timeout: 5000 });

    // Navigate to the fellows expenses reporting page
    await page.goto("/sc/reporting/expenses/fellows");

    // Verify navigation was successful
    await expect(page).toHaveURL("/sc/reporting/expenses/fellows");

    // Optionally, wait for the page to load completely by checking for an element on the page
    await expect(page.getByText("Expenses")).toBeVisible({ timeout: 10000 });
  });
});
