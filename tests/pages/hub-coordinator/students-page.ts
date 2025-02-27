import { Page } from "@playwright/test";
import { AppPage } from "../app-page";
import { getUrl } from "../helpers";

export default class HubCoordinatorStudentsPage extends AppPage {
  readonly route = getUrl("/hc/students");

  constructor(readonly page: Page) {
    super(page);
  }
}
