import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

import { constants } from "#/tests/constants";

export abstract class AppPage {
  readonly page: Page;
  abstract readonly route: string;

  constructor(page: Page) {
    this.page = page;
  }

  async visit() {
    await this.page.goto(this.route);
  }

  async isShown() {
    await expect(this.page).toHaveURL(this.route);
  }

  async openOrganizationSwitcher() {
    await this.page.getByTestId(constants.ORGANIZATION_SWITCHER).click();
  }

  async clickAddMembers() {
    await this.page.getByTestId(constants.ORGANIZATION_MEMBERS_LINK).click();
  }
}
