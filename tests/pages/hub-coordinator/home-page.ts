import type { Page } from "@playwright/test";

import { AppPage } from "#/tests/pages/app-page";
import { getUrl } from "#/tests/pages/helpers";

export class HubCoordinatorHomePage extends AppPage {
  public readonly route = getUrl("/hc/schedule");

  constructor(public readonly page: Page) {
    super(page);
  }
}
