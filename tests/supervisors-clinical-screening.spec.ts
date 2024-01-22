import { expect, test } from "@playwright/test";

import { PersonnelFixtures } from "#/tests/helpers";
import { ClinicalScreeningPage } from "#/tests/pages/supervisors/clinical-screening-page";

test.describe("clinical screenings", () => {
  test.use({ storageState: PersonnelFixtures.supervisor.stateFile });

  test.only("supervisor can submit a clinical screening", async ({ page }) => {
    const clinicalScreeningPage = new ClinicalScreeningPage(page);
    await clinicalScreeningPage.visit();
    await clinicalScreeningPage.isShown();

    await clinicalScreeningPage.openClinicalCaseCreationDialogue();
    await expect(page.getByText("Create Clinical Case")).toBeVisible();

    await clinicalScreeningPage.chooseSchoolInSelectDropdown("ANS23_School_25");
    await expect(page.getByText("Muthurwa Girls").nth(0)).toBeVisible();

    await clinicalScreeningPage.chooseSupervisorInSelectDropdown("SPV23_S_35");
    await expect(page.getByText("Marion Otieno").nth(0)).toBeVisible();

    await clinicalScreeningPage.chooseFellowInSelectDropdown("TFW23_S_221");
    await expect(page.getByText("June Musimbi").nth(0)).toBeVisible();

    await clinicalScreeningPage.chooseStudentInSelectDropdown(
      "Stu_Adm_ANS23_School_28_9",
    );
    await expect(page.getByText("Celia Bogisich").nth(0)).toBeVisible();

    await clinicalScreeningPage.submitClinicalCaseDialogue();

    await clinicalScreeningPage.assertClinicalCaseIsVisible("Celia Bogisich");
  });
});
