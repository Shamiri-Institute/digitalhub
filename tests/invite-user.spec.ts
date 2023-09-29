import { test, expect } from "@playwright/test";

import { IndexPage } from "#/tests/pages/index-page";
import { ManageMembersPage } from "#/tests/pages/manage-members-page";

test("invite user to organization", async ({ page }) => {
  const indexPage = IndexPage.new(page);
  await indexPage.visit();

  await indexPage.openOrganizationSwitcher();
  await indexPage.clickAddMembers();

  const manageMembersPage = ManageMembersPage.new(page);
  await manageMembersPage.isShown();

  await manageMembersPage.clickAddMember();
  await manageMembersPage.fillEmails("test@shamiri.institute");
  await manageMembersPage.selectRole("operations");
  await manageMembersPage.submit();

  await manageMembersPage.verifyMemberAdded("test@shamiri.institute");
});

test("remove user from organization", async ({ page }) => {
  const indexPage = IndexPage.new(page);
  await indexPage.visit();

  await indexPage.openOrganizationSwitcher();
  await indexPage.clickManageMembers();
});
