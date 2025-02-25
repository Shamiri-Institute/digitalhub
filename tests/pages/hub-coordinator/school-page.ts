import type { Page } from "@playwright/test";

import { AppPage } from "#/tests/pages/app-page";
import { getUrl } from "#/tests/pages/helpers";

export default class HubCoordinatorSchoolsPage extends AppPage {
  readonly route = getUrl("/hc/schools");

  constructor(public readonly page: Page) {
    super(page);
  }

  checkKeyComponentsAreVisible() {}

  openWeeklyHubReportDialog() {
    this.page.getByRole("button", {});
  }

  checkTableHasData() {}

  correctlyFillWeeklyHubReportDialog() {}
}
