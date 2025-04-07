import { AppPage } from "#/tests/pages/app-page";
import { getUrl } from "#/tests/pages/helpers";
import { Page } from "@playwright/test";

export default class SupervisorSchoolsPage extends AppPage {
  readonly route = getUrl("/sc/schools");

  constructor(public readonly page: Page) {
    super(page);
  }
}
