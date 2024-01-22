import type { Page } from "@playwright/test";

import { AppPage } from "#/tests/pages/app-page";
import { getUrl } from "#/tests/pages/helpers";

export class HomePage extends AppPage {
  readonly route = getUrl("/");

  static new(page: Page) {
    return new HomePage(page);
  }
}
