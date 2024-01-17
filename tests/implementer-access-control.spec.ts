import { expect, test } from "@playwright/test";

import { OperationsIndexPage } from "#/tests/pages/operations/index-page";

test("should check role-based access for implementer's route group", async ({
  page,
}) => {
  await page.goto("http://localhost:3000/hc");

  await page.getByTestId("google-login").click();

  await page.fill('input[type="email"]', "edmund@shamiri.institute");
  await page.locator("#identifierNext > div > button").click();
  await page.fill(
    '#password >> input[type="password"]',
    "iMAUu*4F-ysJP2zde@v4",
  );
  await page.locator("button >> nth=1").click();

  await expect(page).toHaveURL("http://localhost:3000/hc");

  const indexPage = OperationsIndexPage.new(page);
  await indexPage.visit();
  await indexPage.isShown();
});
