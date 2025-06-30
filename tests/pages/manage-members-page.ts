import type { Page } from "@playwright/test";

import { constants } from "#/tests/constants";
import { AppPage } from "#/tests/pages/app-page";
import { getUrl } from "#/tests/pages/helpers";

export class ManageMembersPage extends AppPage {
  readonly route = getUrl("/settings/organization/members");

  static new(page: Page) {
    return new ManageMembersPage(page);
  }

  async clickAddMember() {
    await this.page.getByTestId(constants.ADD_MEMBERS_BUTTON).click();
  }

  async fillEmails(emails: string) {
    await this.page.getByTestId(constants.ADD_MEMBERS_EMAILS).fill(emails);
  }

  async selectRole(
    role:
      | "admin"
      | "operations"
      | "hub-coordinator"
      | "supervisor"
      | "researcher"
      | "external",
  ) {
    await this.page.getByTestId(constants.ADD_MEMBERS_ROLE).click();
    await this.page
      .getByTestId(`${constants.ADD_MEMBERS_ROLE}-${role}`)
      .click();
  }

  async submit() {
    await this.page.getByTestId(constants.ADD_MEMBERS_SUBMIT).click();
  }
}
