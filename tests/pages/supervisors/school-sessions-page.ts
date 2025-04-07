import { Page } from "@playwright/test";

import { AppPage } from "#/tests/pages/app-page";
import { getUrl } from "#/tests/pages/helpers";

export default class SupervisorSchoolSessionsPage extends AppPage {
  readonly route = getUrl("/sc/schools/ARSENAL_SCH/sessions");

  constructor(public readonly page: Page) {
    super(page);
  }
}
