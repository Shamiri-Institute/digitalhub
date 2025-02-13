import { PersonnelFixtures } from "#/tests/helpers";
import HubCoordinatorSchoolsPage from "#/tests/pages/hub-coordinator/school-page";
import { expect, test } from "@playwright/test";

test.use({ storageState: PersonnelFixtures.hubCoordinator.stateFile });
test.describe.configure({ mode: "parallel" });

test("Hub Coordinator can view the /schools page", async ({ page }) => {
  // given
  const hubCoordinatorSchoolsPage = new HubCoordinatorSchoolsPage(page);
  // when
  await hubCoordinatorSchoolsPage.visit();
  // then
  await hubCoordinatorSchoolsPage.isShown();
  await expect(page.getByRole('button', { name: 'Weekly Hub Report' })).toBeVisible();
  // graphs
  // table
  // weekly hub report
});

test("Hub Coordinator can submit a weekly hub report", async ({ page }) => {
  const hubCoordinatorSchoolsPage = new HubCoordinatorSchoolsPage(page);
  await hubCoordinatorSchoolsPage.visit();

  await page.getByRole('button', { name: 'Add icon circle outlined' }).click();
  await page.getByRole("combobox", { name: "Select week" }).click();
  await page.getByRole('option', { name: 'Week 1' }).click();

  await page
    .locator("label")
    .filter({ hasText: "Hub Related Issues and" })
    .locator("path")
    .nth(1)
    .click();
  await page
    .getByRole("textbox", { name: "Hub Related Issues and" })
    .fill("There have been no issues");
  await page
    .locator("label")
    .filter({ hasText: "School Related Issues and" })
    .locator("path")
    .nth(3)
    .click();
  await page
    .getByRole("textbox", { name: "School Related Issues and" })
    .click();
  await page
    .getByRole("textbox", { name: "School Related Issues and" })
    .fill("The school is ok");
  await page
    .locator("label")
    .filter({ hasText: "Supervisor Related Issues and" })
    .locator("path")
    .nth(2)
    .click();
  await page
    .getByRole("textbox", { name: "Supervisor Related Issues and" })
    .fill("the school is awesome");
  await page
    .getByRole("textbox", { name: "Fellow Related Issues and" })
    .click();
  await page
    .locator("label")
    .filter({ hasText: "Fellow Related Issues and" })
    .getByRole("img")
    .nth(4)
    .click();
  //await page.getByRole('textbox', { name: 'Fellow Related Issues and' }).click();
  await page
    .getByRole("textbox", { name: "Fellow Related Issues and" })
    .fill("The fellows have been ok");
  //await page.getByRole('textbox', { name: 'Successes' }).click();
  await page
    .getByRole("textbox", { name: "Successes" })
    .fill("It has generally been successful");
  //await page.getByRole('textbox', { name: 'Challenges' }).click();
  await page
    .getByRole("textbox", { name: "Challenges" })
    .fill("I don't have any challenges to report");
  //await page.getByRole('textbox', { name: 'Recommendations' }).click();
  await page
    .getByRole("textbox", { name: "Recommendations" })
    .fill("I would recommend continued behaviour");
  await page.getByRole("button", { name: "Submit" }).click();
});
