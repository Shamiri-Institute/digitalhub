import { type Page } from "@playwright/test";

import { AppPage } from "#/tests/pages/app-page";
import { getUrl } from "#/tests/pages/helpers";

export class OperationsHomePage extends AppPage {
  readonly route = getUrl("/ops/reporting");

  static new(page: Page) {
    return new OperationsHomePage(page);
  }
}
