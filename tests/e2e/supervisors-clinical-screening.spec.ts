import { expect, test } from "@playwright/test";

import { PersonnelFixtures } from "#/tests/helpers";
import { ClinicalScreeningPage } from "#/tests/pages/supervisors/clinical-screening-page";

test.describe("clinical screenings", () => {
  test.use({ storageState: PersonnelFixtures.supervisor.stateFile });

  test("supervisor can submit a clinical screening", async ({ page }) => {
    const clinicalScreeningPage = new ClinicalScreeningPage(page);
    await clinicalScreeningPage.visit();
    await clinicalScreeningPage.isShown();

    await clinicalScreeningPage.openClinicalCaseCreationDialogue();
    await expect(page.getByText("Create Clinical Case")).toBeVisible();

    await clinicalScreeningPage.chooseSchoolInSelectDropdown("ANS23_School_25");
    await expect(page.getByText("Muthurwa Girls").nth(0)).toBeVisible();

    await clinicalScreeningPage.chooseSupervisorInSelectDropdown("SPV23_S_36");
    await expect(page.getByText("Isabel Kinyua").nth(0)).toBeVisible();

    await clinicalScreeningPage.chooseFellowInSelectDropdown("TFW23_S_266");
    await expect(page.getByText("Samson Egwina").nth(0)).toBeVisible();

    await clinicalScreeningPage.chooseStudentInSelectDropdown(
      "Stu_Adm_ANS23_School_29_20",
    );
    await expect(page.getByText("Clifford Daugherty").nth(0)).toBeVisible();

    await clinicalScreeningPage.submitClinicalCaseDialogue();

    await clinicalScreeningPage.assertClinicalCaseIsVisible(
      "Clifford Daugherty",
    );
  });
});
