import { AppPage } from "#/tests/pages/app-page";
import { getUrl } from "#/tests/pages/helpers";
import { expect, Page } from "@playwright/test";

export default class SupervisorSchoolsPage extends AppPage {
  readonly route = getUrl("/sc/schools");

  constructor(public readonly page: Page) {
    super(page);
  }

  /**
   * Validates if the dropdown menu can be opened for the first row of the table.
   * Returns the opened dropdown menu element.
   */
  async validateAndOpenDropdownMenu() {
    const rowsCount = await this.page.locator("tbody tr").count();
    expect(rowsCount).toBeGreaterThan(0);

    const firstRow = this.page.locator("tbody tr").first();
    const actionCell = firstRow.locator("td").last();
    await expect(actionCell).toHaveId("0_button");
    await actionCell.click();

    const dropdownMenu = actionCell.locator(
      '[data-testid="school-table-dropdown"]',
    );
    await expect(dropdownMenu).toHaveAttribute("data-state", "open");

    return dropdownMenu;
  }
}
