import type { Page } from "@playwright/test";

import { AppPage } from "#/tests/pages/app-page";
import { getUrl } from "#/tests/pages/helpers";

export class SupervisorHomePage extends AppPage {
  readonly route = getUrl("/sc/schedule");

  static new(page: Page) {
    return new SupervisorHomePage(page);
  }
}
