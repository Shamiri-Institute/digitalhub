import type { Page } from "@playwright/test";

import { AppPage } from "#/tests/pages/app-page";
import { getUrl } from "#/tests/pages/helpers";

export class OperationsHomePage extends AppPage {
  // TODO: Update this to the correct route once we have other parts of the ops reporting page
  readonly route = getUrl("/ops/reporting/expenses/fellows");

  static new(page: Page) {
    return new OperationsHomePage(page);
  }
}
