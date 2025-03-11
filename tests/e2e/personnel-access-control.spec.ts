import { Page, test } from "@playwright/test";

import { PersonnelFixtures } from "#/tests/helpers";
import { ClinicalHomePage } from "#/tests/pages/clinical/home-page";
import { HomePage } from "#/tests/pages/home-page";
import { HubCoordinatorHomePage } from "#/tests/pages/hub-coordinator/home-page";
import { OperationsHomePage } from "#/tests/pages/operations/home-page";
import { SupervisorHomePage } from "../pages/supervisors/home-page";

interface RoleAccessSpec {
  role: string;
  stateFile: string;
  accessiblePages: Array<{ new (page: Page): HomePage }>;
  inaccessiblePages: Array<{ new (page: Page): HomePage }>;
}

// TODO: as other roles are added then we should also ensure
// that we add them to the list of accessible/inacessbile pages
const roleAccessSpecs: RoleAccessSpec[] = [
  {
    role: "supervisors",
    stateFile: PersonnelFixtures.supervisor.stateFile,
    accessiblePages: [SupervisorHomePage],
    inaccessiblePages: [
      HubCoordinatorHomePage,
      ClinicalHomePage,
      OperationsHomePage,
    ],
  },
  {
    role: "hub coordinators",
    stateFile: PersonnelFixtures.hubCoordinator.stateFile,
    accessiblePages: [HubCoordinatorHomePage],
    inaccessiblePages: [
      SupervisorHomePage,
      ClinicalHomePage,
      OperationsHomePage,
    ],
  },
  {
    role: "clinical leads",
    stateFile: PersonnelFixtures.clinicalLead.stateFile,
    accessiblePages: [ClinicalHomePage],
    inaccessiblePages: [
      SupervisorHomePage,
      HubCoordinatorHomePage,
      OperationsHomePage,
    ],
  },
  {
    role: "operations",
    stateFile: PersonnelFixtures.opsUser.stateFile,
    accessiblePages: [OperationsHomePage],
    inaccessiblePages: [
      SupervisorHomePage,
      HubCoordinatorHomePage,
      ClinicalHomePage,
    ],
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
