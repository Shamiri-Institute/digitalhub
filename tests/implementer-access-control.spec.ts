import { expect, test } from "@playwright/test";
import path from "node:path";

import { OperationsIndexPage } from "#/tests/pages/operations/index-page";

const supervisorState = path.resolve(__dirname, "supervisor-state.json");

test("should check role-based access for implementer's route group", async ({
  browser,
}) => {
  const supervisorContext = await browser.newContext({
    storageState: supervisorState,
  });
  const page = await supervisorContext.newPage();
  await page.goto("http://localhost:3000/");

  await page.waitForTimeout(10000);

  await expect(page).toHaveURL("http://localhost:3000/hc");

  const indexPage = OperationsIndexPage.new(page);
  await indexPage.visit();
  await indexPage.isShown();
});
