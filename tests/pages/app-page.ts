import type { Locator, Page } from "@playwright/test";
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

  async isNotShown() {
    await expect(this.page).not.toHaveURL(this.route);
  }

  async openOrganizationSwitcher() {
    await this.page.getByTestId(constants.ORGANIZATION_SWITCHER).click();
  }

  async clickAddMembers() {
    await this.page.getByTestId(constants.ORGANIZATION_MEMBERS_LINK).click();
  }

  /**
   * Validates and opens the dropdown menu for the first row of the table.
   * Ensures the dropdown is open before returning it.
   */
  async validateAndOpenDropdownMenu(actionsDropdownMenu: Locator) {
    // Locate all rows in the table
    const rows = this.page.locator("tbody tr");
    const rowCount = await rows.count();

    // Ensure there is at least one row
    expect(rowCount).toBeGreaterThan(0);

    // Select the first row and its action cell
    const firstRow = rows.first();
    const actionCell = firstRow.locator("td").last();

    // Ensure action button exists and click it
    await expect(actionCell).toBeVisible({ timeout: 3000 });
    await actionCell.click();

    // Wait for the dropdown menu to open
    await expect(actionsDropdownMenu).toHaveAttribute("data-state", "open", {
      timeout: 5000,
    });

    return actionsDropdownMenu;
  }
}
