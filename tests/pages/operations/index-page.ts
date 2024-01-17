import { expect, type Page } from "@playwright/test";

import { AppPage } from "#/tests/pages/app-page";
import { getUrl } from "#/tests/pages/helpers";

export class OperationsIndexPage extends AppPage {
  readonly route = getUrl("/hc");

  static new(page: Page) {
    return new OperationsIndexPage(page);
  }

  async isShown() {
    await expect(this.page).toHaveURL(this.route);
  }
}
