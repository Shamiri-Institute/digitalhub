import type { BrowserContext, Page } from "@playwright/test";
import { eq } from "drizzle-orm";

import { db } from "#/db/client";
import { survey, surveyVersion } from "#/db/schema";
import { researchAdminEmail } from "#/db/seed/fixtures";
import { expect, test, type Undo } from "#/tests/fixtures";
import { signInWithEmail } from "#/tests/helpers";
import { getUrl } from "#/tests/pages/helpers";
import { formWithPages } from "#/tests/survey-fixtures";

/** Signs in as the seed's Research team admin and gives them a draft of three pages. */
async function signInWithDraft(context: BrowserContext, undo: Undo) {
  await signInWithEmail(context, researchAdminEmail);
  const [admin, user, project] = await Promise.all([
    db.query.adminUser.findFirst({ where: (a, { eq }) => eq(a.email, researchAdminEmail) }),
    db.query.user.findFirst({ where: (u, { eq }) => eq(u.email, researchAdminEmail) }),
    db.query.project.findFirst({ where: (p, { eq }) => eq(p.isDefault, true) }),
  ]);
  if (!admin || !user || !project) throw new Error("The seed has no Research team admin");
  const code = `E${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  const [draft] = await db
    .insert(survey)
    .values({
      implementerId: admin.implementerId,
      projectId: project.id,
      code,
      title: `Draft ${code}`,
      createdBy: user.id,
    })
    .returning();
  if (!draft) throw new Error("The survey was not created");
  // Deleting the survey deletes its versions.
  undo(() => db.delete(survey).where(eq(survey.id, draft.id)));
  await db
    .insert(surveyVersion)
    .values({ surveyId: draft.id, versionNumber: 1, createdBy: user.id, form: formWithPages(3) });
  return draft;
}

function pageTab(page: Page, pageNumber: number) {
  return page
    .getByRole("navigation", { name: "Pages" })
    .getByRole("button", { name: new RegExp(`^Page ${pageNumber}(?!\\d)`) });
}

function pageItems(page: Page, pageNumber: number) {
  return page.getByRole("region", { name: `Page ${pageNumber}`, exact: true });
}

test("the builder's page is in the URL, so a link or a reload opens it", async ({
  page,
  context,
  undo,
}) => {
  const draft = await signInWithDraft(context, undo);
  const builderUrl = getUrl(`/admin/surveys/${draft.id}/versions/1`);

  await page.goto(`${builderUrl}?page=2`);
  await expect(pageItems(page, 2)).toBeVisible();

  // A click before hydration does nothing, so click until the URL changes.
  await expect(async () => {
    await pageTab(page, 3).click();
    await expect(page).toHaveURL(/\?page=3$/, { timeout: 2000 });
  }).toPass();
  await expect(pageItems(page, 3)).toBeVisible();

  await page.reload();
  await expect(pageItems(page, 3)).toBeVisible();
  await expect(pageTab(page, 3)).toHaveAttribute("aria-current", "page");

  await page.goto(`${builderUrl}?page=9`);
  await expect(pageItems(page, 1)).toBeVisible();
});

test("picking a page with unsaved changes asks nothing, and Back still asks", async ({
  page,
  context,
  undo,
}) => {
  const draft = await signInWithDraft(context, undo);
  await page.goto(getUrl(`/admin/surveys/${draft.id}`));
  await page.getByRole("link", { name: "v1", exact: true }).click();
  await expect(page).toHaveURL(/\/versions\/1$/);
  // Text typed before hydration is reset by it, so type until the builder counts the change.
  await expect(async () => {
    await page.getByLabel("Page title").fill("About you");
    await expect(page.getByText("Unsaved changes")).toBeVisible({ timeout: 2000 });
  }).toPass();

  const prompts: string[] = [];
  page.on("dialog", (dialog) => {
    prompts.push(dialog.message());
    void dialog.dismiss();
  });
  await pageTab(page, 2).click();
  await expect(page).toHaveURL(/\/versions\/1\?page=2$/);
  await expect(pageItems(page, 2)).toBeVisible();
  expect(prompts).toEqual([]);

  // Dismissed, the Back navigation is cancelled and the builder keeps the page and the change.
  await page.goBack({ timeout: 3000 }).catch(() => null);
  expect(prompts).toHaveLength(1);
  await expect(page).toHaveURL(/\/versions\/1\?page=2$/);
  await expect(page.getByText("Unsaved changes")).toBeVisible();
});
