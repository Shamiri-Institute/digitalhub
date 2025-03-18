import type { Page } from "@playwright/test";

import { AppPage } from "#/tests/pages/app-page";
import { getUrl } from "#/tests/pages/helpers";

export default class SupervisorSchoolDetailsPage extends AppPage {
  readonly route = getUrl("/sc/schools/TOJODE/fellows");

  constructor(public readonly page: Page) {
    super(page);
  }
}
