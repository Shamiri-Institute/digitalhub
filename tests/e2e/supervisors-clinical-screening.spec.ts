import { expect, test } from "@playwright/test";

import { PersonnelFixtures } from "#/tests/helpers";
import { ClinicalScreeningPage } from "#/tests/pages/supervisors/clinical-screening-page";

test.describe.skip("clinical screenings", () => {
  test.use({ storageState: PersonnelFixtures.supervisor.stateFile });

  test("supervisor can submit a clinical screening", async ({ page }) => {
    const clinicalScreeningPage = new ClinicalScreeningPage(page);
    await clinicalScreeningPage.visit();
    await clinicalScreeningPage.isShown();

    await clinicalScreeningPage.openClinicalCaseCreationDialogue();
    await expect(page.getByText("Create Clinical Case")).toBeVisible();

    await clinicalScreeningPage.chooseSchoolInSelectDropdown("ANS23_School_22");
    await expect(page.getByText("Dandora High").nth(0)).toBeVisible();
    await page.waitForLoadState("networkidle");

    await clinicalScreeningPage.chooseSupervisorInSelectDropdown("SPV23_S_20");
    await expect(page.getByText("Zakia Arbubaqar").nth(0)).toBeVisible();
    await page.waitForLoadState("networkidle");

    await clinicalScreeningPage.chooseFellowInSelectDropdown("TFW23_S_115");
    await expect(page.getByText("Georgina Wamaitha").nth(0)).toBeVisible();
    await page.waitForLoadState("networkidle");

    // Make sure to pick an option visible on the screen
    await clinicalScreeningPage.chooseStudentInSelectDropdown(
      "Stu_Adm_ANS23_School_17_13",
    );
    await expect(page.getByText("Student 12").nth(0)).toBeVisible();

    await clinicalScreeningPage.submitClinicalCaseDialogue();

    await clinicalScreeningPage.assertClinicalCaseIsVisible("Student 12");
  });
});
