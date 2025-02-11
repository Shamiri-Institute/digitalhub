import type { Page } from "@playwright/test";

import { AppPage } from "#/tests/pages/app-page";
import { getUrl } from "#/tests/pages/helpers";

export class HubCoordinatorHomePage extends AppPage {
  readonly route = getUrl("/hc/schedule");

  static new(page: Page) {
    return new HubCoordinatorHomePage(page);
  }
}
