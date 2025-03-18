import { PersonnelFixtures } from "#/tests/helpers";
import SupervisorSchoolDetailsPage from "#/tests/pages/supervisors/school-details-page";
import SupervisorSchoolsPage from "#/tests/pages/supervisors/schools-page";
import { expect, test } from "@playwright/test";

test.use({ storageState: PersonnelFixtures.supervisor.stateFile });

const SELECTORS = {
  DROPDOWN_MENU: '[data-testid="school-table-dropdown"]',
  SESSIONS_TAB: '[data-testid="school-sessions-tab"]',
  TABLE_BODY: "tbody tr",
  H2_HEADER: "h2",
};

const ACTIONS = {
  VIEW_SCHOOL_MENU: "View school",
};

test.describe.configure({ mode: "parallel" });

test.describe("supervisor’s schools page functionalities", () => {
  let supervisorSchoolsPage: SupervisorSchoolsPage;

  test.beforeEach(async ({ page }) => {
    supervisorSchoolsPage = new SupervisorSchoolsPage(page);
    await supervisorSchoolsPage.visit();
  });

  test("supervisor can access and confirm the schools page displays a header", async ({
    page,
  }) => {
    await supervisorSchoolsPage.isShown();
    await expect(page.locator(SELECTORS.H2_HEADER)).toContainText("Schools");
  });

  test("supervisor can navigate to a school's details page via dropdown", async ({
    page,
  }) => {
    await supervisorSchoolsPage.validateAndOpenDropdownMenu();

    const viewSchoolMenuItem = page.getByRole("menuitem", {
      name: ACTIONS.VIEW_SCHOOL_MENU,
    });
    const schoolPageURL = await viewSchoolMenuItem.getAttribute("href");
    expect(schoolPageURL).toBeTruthy();

    await viewSchoolMenuItem.click();
    await expect(page).toHaveURL(schoolPageURL!);
  });
});

test.describe("supervisor’s school details page functionalities", () => {
  let supervisorSchoolDetailsPage: SupervisorSchoolDetailsPage;

  test.beforeEach(async ({ page }) => {
    supervisorSchoolDetailsPage = new SupervisorSchoolDetailsPage(page);
    await supervisorSchoolDetailsPage.visit();
  });

  test("supervisor can access a school's sessions page", async ({ page }) => {
    await supervisorSchoolDetailsPage.isShown();
    const sessionsTab = page.locator(SELECTORS.SESSIONS_TAB);
    await expect(sessionsTab).toContainText("Sessions");

    await sessionsTab.click();
    const sessionsRoute = supervisorSchoolDetailsPage.route.replace(
      /\/[^/]*$/,
      "/sessions",
    );
    await expect(page).toHaveURL(sessionsRoute);
  });
});
