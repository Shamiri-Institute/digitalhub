import { and, asc, eq, isNull } from "drizzle-orm";

import { db } from "#/db/client";
import { hub, project, surveyQuestionnaire } from "#/db/schema";
import { researchAdminEmail } from "#/db/seed/fixtures";
import { expect, test, type Undo } from "#/tests/fixtures";
import { required, signInWithEmail } from "#/tests/helpers";
import { getUrl } from "#/tests/pages/helpers";
import {
  CLEAN_PRINT_FORM_READS,
  createPrintSchool,
  createPublishedSurvey,
  createScannedCopy,
  removeSurvey,
} from "#/tests/survey-fixtures";
import { createUnidentifiedPages } from "#/tests/survey-scan-fixtures";
import { PRINT_FORM } from "#/tests/unit/fixtures/survey-print-form";

// Each worker loads this file on its own, so each makes surveys with codes of its own.
const surveyCode = `U${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

/** The Research admin's oldest hub, as the scope of the scans and copies a test makes there. */
async function researchHubScope() {
  const [user, admin] = await Promise.all([
    db.query.user.findFirst({ where: (u, { eq }) => eq(u.email, researchAdminEmail) }),
    db.query.adminUser.findFirst({ where: (a, { eq }) => eq(a.email, researchAdminEmail) }),
  ]);
  required(user, "a Research team admin");
  required(admin, "a Research team admin profile");
  const [researchHub] = await db
    .select({ hubId: hub.id, projectId: hub.projectId })
    .from(hub)
    .innerJoin(project, eq(project.id, hub.projectId))
    .where(
      and(
        eq(project.isDefault, true),
        eq(hub.implementerId, admin.implementerId),
        isNull(hub.archivedAt),
      ),
    )
    .orderBy(asc(hub.createdAt), asc(hub.id))
    .limit(1);
  required(researchHub, "a hub of the admin's implementer in the default project");
  return { ...researchHub, implementerId: admin.implementerId, userId: user.id };
}

/** A survey of the Research admin's oldest hub with one copy scanned on `pageNumbers`. */
async function partlyScannedCopy(code: string, pageNumbers: number[], undo: Undo) {
  const scope = await researchHubScope();
  const school = await createPrintSchool({ hubId: scope.hubId, schoolName: `Pages ${code}` });
  undo(school.remove);
  const { id: surveyId, versionId } = await createPublishedSurvey({
    code,
    implementerId: scope.implementerId,
    projectId: scope.projectId,
    createdBy: scope.userId,
    form: PRINT_FORM,
  });
  undo(() => removeSurvey({ code }));
  const copy = await createScannedCopy({
    scope,
    versionId,
    schoolId: school.schoolId,
    reads: CLEAN_PRINT_FORM_READS,
    pageNumbers,
  });
  undo(copy.remove);
  const [stored] = await db
    .select({ serial: surveyQuestionnaire.serial })
    .from(surveyQuestionnaire)
    .where(eq(surveyQuestionnaire.id, copy.questionnaireId));
  required(stored, "the copy's serial");
  return { scope, surveyId, copyId: copy.questionnaireId, serial: stored.serial };
}

test("a Research admin places an unidentified page by its code, and its copy shows it", async ({
  page,
  context,
  undo,
}) => {
  const { scope, copyId, serial } = await partlyScannedCopy(`${surveyCode}A`, [1, 2], undo);
  const fileName = `unread-${surveyCode}A.pdf`;
  const unread = await createUnidentifiedPages({ scope, fileName });
  // Removed before the copy, whose printed page it ends up on.
  undo(unread.remove);

  // Other workers' pages are newer than this one, so the list is narrowed to its upload.
  const uploadPagesUrl = getUrl(`/admin/surveys/pages?upload=${unread.uploadId}`);
  await signInWithEmail(context, researchAdminEmail);
  await page.goto(uploadPagesUrl);
  const card = page.getByRole("listitem").filter({ hasText: fileName });
  await expect(card).toContainText("Page 1 of the file");
  await card.getByLabel("Printed page code").fill(`${serial}-P2`);
  await card.getByRole("button", { name: "Place page" }).click();
  await expect(card).toContainText(`Page 2 of ${serial} already has a scan. Check the code.`);
  await card.getByLabel("Printed page code").fill(`${serial.toLowerCase()} p3`);
  await card.getByRole("button", { name: "Place page" }).click();
  await expect(page.getByText(`Placed on ${serial} page 3`)).toBeVisible();
  await page.getByRole("button", { name: "Open copy" }).click();
  await expect(page).toHaveURL(getUrl(`/admin/surveys/copies/${copyId}`));

  await page.reload();
  await expect(page.getByRole("heading", { name: serial, level: 1 })).toBeVisible();
  await expect(page.getByRole("link", { name: /^Page 3/ })).toContainText("needs review");
  await expect(page.getByRole("link", { name: "Needs review", exact: true })).toHaveCount(2);
  await expect(
    page.getByRole("region", { name: "History" }).getByRole("listitem").first(),
  ).toContainText("You placed page 3");

  await page.goto(uploadPagesUrl);
  await expect(page.getByText("No unidentified pages.")).toBeVisible();
});

test("a Research admin is told a page placed from another tab meanwhile, and the list drops it", async ({
  page,
  context,
  undo,
}) => {
  const { scope, serial } = await partlyScannedCopy(`${surveyCode}D`, [1, 2], undo);
  const fileName = `unread-${surveyCode}D.pdf`;
  const unread = await createUnidentifiedPages({ scope, fileName });
  // Removed before the copy, whose printed page it ends up on.
  undo(unread.remove);
  const uploadPagesUrl = getUrl(`/admin/surveys/pages?upload=${unread.uploadId}`);

  await signInWithEmail(context, researchAdminEmail);
  await page.goto(uploadPagesUrl);
  const card = page.getByRole("listitem").filter({ hasText: fileName });
  await expect(card).toHaveCount(1);

  const otherTab = await context.newPage();
  await otherTab.goto(uploadPagesUrl);
  const otherTabCard = otherTab.getByRole("listitem").filter({ hasText: fileName });
  await otherTabCard.getByLabel("Printed page code").fill(`${serial}-P3`);
  await otherTabCard.getByRole("button", { name: "Place page" }).click();
  await expect(otherTab.getByText(`Placed on ${serial} page 3`)).toBeVisible();
  await otherTab.close();

  await card.getByLabel("Printed page code").fill(`${serial}-P3`);
  await card.getByRole("button", { name: "Place page" }).click();
  await expect(page.getByText("This page was placed already.")).toBeVisible();
  await expect(card).toHaveCount(0);
});

test("a Research admin pages through one upload's unidentified pages, then every file's", async ({
  page,
  context,
  undo,
}) => {
  const fileName = `long-unread-${surveyCode}C.pdf`;
  const unread = await createUnidentifiedPages({
    scope: await researchHubScope(),
    count: 25,
    fileName,
  });
  undo(unread.remove);

  await signInWithEmail(context, researchAdminEmail);
  await page.goto(getUrl("/admin/surveys/scans"));
  await page
    .getByRole("row")
    .filter({ hasText: fileName })
    .getByRole("link", { name: "25 unidentified" })
    .click();
  await expect(page).toHaveURL(getUrl(`/admin/surveys/pages?upload=${unread.uploadId}`));
  await expect(page.getByText("25 to place")).toBeVisible();
  const cards = page.getByRole("listitem").filter({ hasText: fileName });
  await expect(cards).toHaveCount(24);
  const listPages = page.getByRole("navigation", { name: "Pages of the list" });
  await expect(listPages).toContainText("Page 1 of 2");

  await listPages.getByRole("link", { name: "Next" }).click();
  await expect(listPages).toContainText("Page 2 of 2");
  await expect(cards).toHaveCount(1);

  await page.getByRole("link", { name: "Show every file's pages" }).click();
  await expect(page).toHaveURL(getUrl("/admin/surveys/pages"));
  await expect(page.getByRole("link", { name: "Show every file's pages" })).toHaveCount(0);
  await expect(page.getByText("25 to place")).toHaveCount(0);
});

test("a Research admin finds a copy missing pages from its survey's progress", async ({
  page,
  context,
  undo,
}) => {
  const { surveyId, copyId, serial } = await partlyScannedCopy(`${surveyCode}B`, [1, 3], undo);

  await signInWithEmail(context, researchAdminEmail);
  await page.goto(getUrl(`/admin/surveys/${surveyId}`));
  await page
    .getByRole("table", { name: "Progress by school" })
    .getByRole("link", { name: "1", exact: true })
    .click();

  await expect(page.getByRole("link", { name: /^Missing pages/ })).toHaveAttribute(
    "aria-current",
    "page",
  );
  const row = page.getByRole("row").filter({ hasText: serial });
  await expect(row).toContainText("P2");
  await expect(row).toContainText("2 of 3 scanned");
  await row.getByRole("link", { name: serial }).click();
  await expect(page).toHaveURL(getUrl(`/admin/surveys/copies/${copyId}`));
  await expect(page.getByRole("heading", { name: serial, level: 1 })).toBeVisible();
});
