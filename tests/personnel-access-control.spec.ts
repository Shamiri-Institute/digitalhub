import { Page, test } from "@playwright/test";

import { PersonnelFixtures } from "#/tests/helpers";
import { HomePage } from "#/tests/pages/home-page";
import { HubCoordinatorHomePage } from "#/tests/pages/hub-coordinator/home-page";
import { OperationsHomePage } from "#/tests/pages/operations/home-page";

interface RoleAccessSpec {
  role: string;
  stateFile: string;
  accessiblePages: Array<{ new (page: Page): HomePage }>;
  inaccessiblePages: Array<{ new (page: Page): HomePage }>;
}

const roleAccessSpecs: RoleAccessSpec[] = [
  {
    role: "supervisors",
    stateFile: PersonnelFixtures.supervisor.stateFile,
    accessiblePages: [HomePage],
    inaccessiblePages: [HubCoordinatorHomePage, OperationsHomePage],
  },
  {
    role: "hub coordinators",
    stateFile: PersonnelFixtures.hubCoordinator.stateFile,
    accessiblePages: [HubCoordinatorHomePage],
    inaccessiblePages: [HomePage, OperationsHomePage],
  },
  {
    role: "operations",
    stateFile: PersonnelFixtures.operations.stateFile,
    accessiblePages: [OperationsHomePage],
    inaccessiblePages: [HomePage, HubCoordinatorHomePage],
  },
];

roleAccessSpecs.forEach(
  ({ role, stateFile, accessiblePages, inaccessiblePages }) => {
    test.describe(`${role} can only access routes based on their role`, () => {
      test.use({ storageState: stateFile });

      accessiblePages.forEach((AccessiblePage) => {
        test(`can access ${AccessiblePage.name.toLowerCase()}`, async ({
          page,
        }) => {
          const accessiblePage = new AccessiblePage(page);
          await accessiblePage.visit();
          await accessiblePage.isShown();
        });
      });

      inaccessiblePages.forEach((InaccessiblePage) => {
        test(`cannot access ${InaccessiblePage.name.toLowerCase()}`, async ({
          page,
        }) => {
          const inaccessiblePage = new InaccessiblePage(page);
          await inaccessiblePage.visit();
          await inaccessiblePage.isNotShown();
        });
      });
    });
  },
);
