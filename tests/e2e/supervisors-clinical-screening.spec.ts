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
    await page.waitForLoadState("networkidle");

    await clinicalScreeningPage.chooseSupervisorInSelectDropdown("SPV23_S_36");
    await expect(page.getByText("Isabel Kinyua").nth(0)).toBeVisible();
    await page.waitForLoadState("networkidle");

    await clinicalScreeningPage.chooseFellowInSelectDropdown("TFW23_S_263");
    await expect(page.getByText("Lindsey Asiome").nth(0)).toBeVisible();
    await page.waitForLoadState("networkidle");

    await clinicalScreeningPage.chooseStudentInSelectDropdown(
      "Stu_Adm_ANS23_School_43_20",
    );
    await expect(page.getByText("Student 19").nth(0)).toBeVisible();

    await clinicalScreeningPage.submitClinicalCaseDialogue();

    await clinicalScreeningPage.assertClinicalCaseIsVisible("Student 19");
  });
});
