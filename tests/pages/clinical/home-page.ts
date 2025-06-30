import type { Page } from "@playwright/test";

import { AppPage } from "#/tests/pages/app-page";
import { getUrl } from "#/tests/pages/helpers";

export class ClinicalHomePage extends AppPage {
  readonly route = getUrl("/cl/clinical");

  static new(page: Page) {
    return new ClinicalHomePage(page);
  }
}
