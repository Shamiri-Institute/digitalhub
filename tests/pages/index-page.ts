import type { Page } from "@playwright/test";

import { AppPage } from "#/tests/pages/app-page";
import { getUrl } from "#/tests/pages/helpers";

export class IndexPage extends AppPage {
  readonly route = getUrl("/");

  static new(page: Page) {
    return new IndexPage(page);
  }
}
