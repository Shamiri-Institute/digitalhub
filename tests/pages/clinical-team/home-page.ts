import { type Page } from "@playwright/test";

import { AppPage } from "#/tests/pages/app-page";
import { getUrl } from "#/tests/pages/helpers";

export class ClinicalTeamHomePage extends AppPage {
  readonly route = getUrl("/ct/clinical");

  static new(page: Page) {
    return new ClinicalTeamHomePage(page);
  }
}
