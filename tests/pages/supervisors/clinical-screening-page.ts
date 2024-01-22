import { expect, type Page } from "@playwright/test";

import { constants } from "#/tests/constants";
import { AppPage } from "#/tests/pages/app-page";
import { getUrl } from "#/tests/pages/helpers";

export class ClinicalScreeningPage extends AppPage {
  readonly route = getUrl("/screenings");

  static new(page: Page) {
    return new ClinicalScreeningPage(page);
  }

  async openClinicalCaseCreationDialogue() {
    await this.page
      .getByTestId(constants.OPEN_CLINICAL_CASE_DIALOGUE_BUTTON)
      .click();
  }

  async chooseSchoolInSelectDropdown(schoolVisibleId: string) {
    await this.page.getByTestId(constants.SELECT_CLINICAL_CASE_SCHOOL).click();
    await this.page
      .getByTestId(
        `${constants.SELECT_CLINICAL_CASE_SCHOOL}-${schoolVisibleId}`,
      )
      .click();
  }

  async chooseSupervisorInSelectDropdown(supervisorVisibleId: string) {
    await this.page
      .getByTestId(constants.SELECT_CLINICAL_CASE_SUPERVISOR)
      .click();
    await this.page
      .getByTestId(
        `${constants.SELECT_CLINICAL_CASE_SUPERVISOR}-${supervisorVisibleId}`,
      )
      .click();
  }

  async chooseFellowInSelectDropdown(fellowVisibleId: string) {
    await this.page.getByTestId(constants.SELECT_CLINICAL_CASE_FELLOW).click();
    await this.page
      .getByTestId(
        `${constants.SELECT_CLINICAL_CASE_FELLOW}-${fellowVisibleId}`,
      )
      .click();
  }

  async chooseStudentInSelectDropdown(studentVisibleId: string) {
    await this.page.getByTestId(constants.SELECT_CLINICAL_CASE_STUDENT).click();
    await this.page
      .getByTestId(
        `${constants.SELECT_CLINICAL_CASE_STUDENT}-${studentVisibleId}`,
      )
      .click();
  }

  async submitClinicalCaseDialogue() {
    await this.page.getByTestId(constants.CREATE_CLINICAL_CASE_BUTTON).click();
  }

  async assertClinicalCaseIsVisible(studentName: string) {
    const casesList = this.page.getByTestId(constants.CLINICAL_CASES_LIST);
    const caseCard = casesList
      .locator(`p[data-testid="${constants.CLINICAL_CASES_LIST_NAME}"]`)
      .nth(0);
    await expect(caseCard).toHaveText(studentName);
  }
}
