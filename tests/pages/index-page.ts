import type { Page } from "@playwright/test";

import { getUrl } from "#/tests/pages/helpers";
import { AppPage } from "#/tests/pages/app-page";

export class IndexPage extends AppPage {
  readonly route = getUrl("/");

  static new(page: Page) {
    return new IndexPage(page);
  }
}
