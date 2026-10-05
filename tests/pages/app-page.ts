import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

export abstract class AppPage {
  readonly page: Page;
  abstract readonly route: string;

  constructor(page: Page) {
    this.page = page;
  }

  async visit() {
    await this.page.goto(this.route);
  }

  async isShown() {
    await expect(this.page).toHaveURL(this.route);
  }
}
