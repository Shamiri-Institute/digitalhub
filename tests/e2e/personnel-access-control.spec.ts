import { expect, type Page, test } from "@playwright/test";

import { roleHome } from "#/lib/auth/role-home";
import { PersonnelFixtures } from "#/tests/helpers";
import { ClinicalHomePage } from "#/tests/pages/clinical/home-page";
import { getUrl } from "#/tests/pages/helpers";
import type { HomePage } from "#/tests/pages/home-page";
import { HubCoordinatorHomePage } from "#/tests/pages/hub-coordinator/home-page";
import { OperationsHomePage } from "#/tests/pages/operations/home-page";
import { SupervisorHomePage } from "../pages/supervisors/home-page";

interface RoleAccessSpec {
  role: string;
  stateFile: string;
  /** Where the role is sent when it opens another role's page. */
  home: string;
  accessiblePages: Array<{ new (page: Page): HomePage }>;
  inaccessiblePages: Array<{ new (page: Page): HomePage }>;
}

// TODO: as other roles are added then we should also ensure
// that we add them to the list of accessible/inacessbile pages
const roleAccessSpecs: RoleAccessSpec[] = [
  {
    role: "supervisors",
    stateFile: PersonnelFixtures.supervisor.stateFile,
    home: roleHome.SUPERVISOR,
    accessiblePages: [SupervisorHomePage],
    inaccessiblePages: [HubCoordinatorHomePage, ClinicalHomePage, OperationsHomePage],
  },
  {
    role: "hub coordinators",
    stateFile: PersonnelFixtures.hubCoordinator.stateFile,
    home: roleHome.HUB_COORDINATOR,
    accessiblePages: [HubCoordinatorHomePage],
    inaccessiblePages: [SupervisorHomePage],
  },
  {
    role: "clinical leads",
    stateFile: PersonnelFixtures.clinicalLead.stateFile,
    home: roleHome.CLINICAL_LEAD,
    accessiblePages: [ClinicalHomePage],
    inaccessiblePages: [SupervisorHomePage, HubCoordinatorHomePage],
  },
  {
    role: "operations",
    stateFile: PersonnelFixtures.opsUser.stateFile,
    home: roleHome.OPERATIONS,
    accessiblePages: [OperationsHomePage],
    inaccessiblePages: [SupervisorHomePage, HubCoordinatorHomePage, ClinicalHomePage],
  },
];

roleAccessSpecs.forEach(({ role, stateFile, home, accessiblePages, inaccessiblePages }) => {
  test.describe(`${role} can only access routes based on their role`, () => {
    test.use({ storageState: stateFile });

    accessiblePages.forEach((AccessiblePage) => {
      test(`can access ${AccessiblePage.name.toLowerCase()}`, async ({ page }) => {
        const accessiblePage = new AccessiblePage(page);
        await accessiblePage.visit();
        await accessiblePage.isShown();
      });
    });

    inaccessiblePages.forEach((InaccessiblePage) => {
      test(`cannot access ${InaccessiblePage.name.toLowerCase()}`, async ({ page }) => {
        const inaccessiblePage = new InaccessiblePage(page);
        await inaccessiblePage.visit();
        // Leaving the page is not enough: a redirect to /login leaves it too.
        await expect(page).toHaveURL(new RegExp(`^${getUrl(home)}(/|\\?|$)`));
      });
    });
  });
});
