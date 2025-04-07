import { db } from "#/lib/db";
import { PersonnelFixtures } from "#/tests/helpers";
import SupervisorSchoolFellowsPage from "#/tests/pages/supervisors/school-fellows-page";
import SupervisorSchoolSessionsPage from "#/tests/pages/supervisors/school-sessions-page";
import SupervisorSchoolsPage from "#/tests/pages/supervisors/schools-page";
import { ACTIONS, SELECTORS } from "#/tests/selectors";
import { expect, test } from "@playwright/test";

// Test constants
const UNASSIGNED_SCHOOL_ID = "SOBHA_SCH";
const TEST_FELLOW_NAME = "Bukayo Saka";

// Helper functions
async function resetSessionStatus(page: any, rowId: string) {
  try {
    await db.interventionSession.update({
      where: { id: rowId },
      data: { occurred: false, status: "Scheduled" },
    });
    await page.reload();
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    throw new Error(`Failed to reset session status: ${errorMessage}`);
  }
}

async function markSessionAsAttended(page: any, firstRow: any) {
  await page.locator(SELECTORS.MARK_SESSION_ATTENDED_RADIO).click();
  await page.locator(SELECTORS.SUBMIT_SESSION_OCCURRENCE_BUTTON).click();
  await expect(
    page.locator(SELECTORS.CONFIRM_MARK_SESSION_OCCURRENCE_DIALOG),
  ).toBeVisible();
  await page
    .locator(SELECTORS.CONFIRM_SUBMIT_SESSION_OCCURRENCE_BUTTON)
    .click();
  await expect(
    firstRow.locator(SELECTORS.SESSION_OCCURRENCE_STATUS),
  ).toHaveText("Attended");
}

test.use({ storageState: PersonnelFixtures.supervisor.stateFile });

test.describe.configure({ mode: "parallel" });

test.describe("supervisor schools management", () => {
  test.describe("schools list page", () => {
    test.beforeEach(async ({ page }) => {
      const supervisorSchoolsPage = new SupervisorSchoolsPage(page);
      await supervisorSchoolsPage.visit();
    });

    test("should display the schools page header", async ({ page }) => {
      await expect(page.locator(SELECTORS.H2_HEADER)).toContainText("Schools");
    });

    test("should navigate to school details via dropdown menu", async ({ page }) => {
      const supervisorSchoolsPage = new SupervisorSchoolsPage(page);
      const dropdownMenu = await supervisorSchoolsPage.validateAndOpenDropdownMenu(
        page.locator(SELECTORS.SCHOOLS_TABLE_DROPDOWN),
      );
      await dropdownMenu
        .getByRole("menuitem", { name: ACTIONS.VIEW_SCHOOL_MENU })
        .click();
      await expect(page).toHaveURL(/\/schools\/.+/);
    });
  });

  test.describe("school fellows page", () => {
    test.beforeEach(async ({ page }) => {
      const supervisorSchoolFellowsPage = new SupervisorSchoolFellowsPage(page);
      await supervisorSchoolFellowsPage.visit();
    });

    test("should navigate to school sessions page", async ({ page }) => {
      await page.locator(SELECTORS.SESSIONS_TAB).click();
      await expect(page).toHaveURL(/\/schools\/.+\/sessions/);
    });
  });

  test.describe("school sessions management", () => {
    let supervisorSchoolSessionsPage: SupervisorSchoolSessionsPage;

    test.beforeEach(async ({ page }) => {
      supervisorSchoolSessionsPage = new SupervisorSchoolSessionsPage(page);
      await supervisorSchoolSessionsPage.visit();
    });

    test("should prevent unassigned supervisor from marking session as occurred", async ({ page }) => {
      const route = `/sc/schools/${UNASSIGNED_SCHOOL_ID}/sessions`;
      await page.goto(route);
      await expect(page).toHaveURL(route);

      const dropdownMenu = await supervisorSchoolSessionsPage.validateAndOpenDropdownMenu(
        page.locator(SELECTORS.SESSIONS_TABLE_DROPDOWN),
      );
      const markSessionOccurrenceMenuItem = dropdownMenu.getByRole("menuitem", {
        name: ACTIONS.MARK_SESSION_OCCURRENCE,
      });

      await expect(markSessionOccurrenceMenuItem).toBeDisabled();
    });

    test("should allow assigned supervisor to mark session as occurred", async ({ page }) => {
      const supervisorSchoolSessionsPage = new SupervisorSchoolSessionsPage(page);
      const firstRow = page.locator("tbody tr").first();
      const status = firstRow.locator(SELECTORS.SESSION_OCCURRENCE_STATUS);
      const statusText = await status.textContent();

      if (statusText === "Attended" || statusText === "Cancelled") {
        const rowId = await status.getAttribute("data-rowid");
        if (!rowId) {
          throw new Error("Failed to get session row ID. Cannot update session occurrence.");
        }
        await resetSessionStatus(page, rowId);
      }

      const dropdownMenu = await supervisorSchoolSessionsPage.validateAndOpenDropdownMenu(
        page.locator(SELECTORS.SESSIONS_TABLE_DROPDOWN),
      );
      await dropdownMenu
        .getByRole("menuitem", { name: ACTIONS.MARK_SESSION_OCCURRENCE })
        .click();

      await expect(
        page.locator(SELECTORS.MARK_SESSION_OCCURRENCE_DIALOG),
      ).toBeVisible();
      
      await markSessionAsAttended(page, firstRow);
    });

    test("should allow marking fellow attendance", async ({ page }) => {
      const supervisorSchoolSessionsPage = new SupervisorSchoolSessionsPage(page);
      const dropdownMenu = await supervisorSchoolSessionsPage.validateAndOpenDropdownMenu(
        page.locator(SELECTORS.SESSIONS_TABLE_DROPDOWN),
      );
      await dropdownMenu
        .getByRole("menuitem", { name: ACTIONS.MARK_FELLOW_ATTENDANCE })
        .click();

      await expect(
        page.locator(SELECTORS.FELLOW_ATTENDANCE_DIALOG),
      ).toBeVisible();

      const supervisorName = await page
        .locator(SELECTORS.SELECT_SUPERVISOR_INPUT)
        .textContent();
      expect(supervisorName).not.toBeNull();

      const row = page.locator("tr", { hasText: TEST_FELLOW_NAME }).first();
      await row.locator('[aria-haspopup="menu"]').click();
      await expect(row.locator('[aria-haspopup="menu"]')).toHaveAttribute(
        "data-state",
        "open",
      );

      const statusText = await row
        .locator(SELECTORS.SESSION_ATTENDANCE_STATUS)
        .textContent();
      if (statusText === "Not marked") {
        await page
          .getByRole("menuitem", { name: ACTIONS.MARK_FELLOW_ATTENDANCE })
          .click();
        await expect(
          page.locator(SELECTORS.MARK_ATTENDANCE_DIALOG),
        ).toBeVisible();
        await page.locator("#mark_attended").check();
        await page.getByRole("button", { name: "Submit" }).click();
      }
    });
  });
});
