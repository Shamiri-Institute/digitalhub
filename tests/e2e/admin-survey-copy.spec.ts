import { and, asc, eq, isNull } from "drizzle-orm";

import { db } from "#/db/client";
import { hub, project, surveyQuestionnaire } from "#/db/schema";
import { researchAdminEmail } from "#/db/seed/fixtures";
import { expect, test } from "#/tests/fixtures";
import { signInWithEmail } from "#/tests/helpers";
import { getUrl } from "#/tests/pages/helpers";
import {
  CLEAN_PRINT_FORM_READS,
  createPrintSchool,
  createPublishedSurvey,
  createScannedCopy,
  removeSurvey,
} from "#/tests/survey-fixtures";
import { PRINT_FORM } from "#/tests/unit/fixtures/survey-print-form";

// Each worker loads this file on its own, so each makes a survey with a code of its own.
const surveyCode = `K${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
const copyRemovals: (() => Promise<void>)[] = [];
let removeSchool: (() => Promise<void>) | undefined;
let setup: Awaited<ReturnType<typeof surveyForCopies>> | undefined;

async function surveyForCopies() {
  const [[researchHub], user, admin] = await Promise.all([
    db
      .select({ hubId: hub.id, projectId: hub.projectId })
      .from(hub)
      .innerJoin(project, eq(project.id, hub.projectId))
      .where(and(eq(project.isDefault, true), isNull(hub.archivedAt)))
      .orderBy(asc(hub.id))
      .limit(1),
    db.query.user.findFirst({ where: (u, { eq }) => eq(u.email, researchAdminEmail) }),
    db.query.adminUser.findFirst({ where: (a, { eq }) => eq(a.email, researchAdminEmail) }),
  ]);
  if (!researchHub || !user || !admin) throw new Error("The seed has no Research team admin");
  const scope = { ...researchHub, implementerId: admin.implementerId, userId: user.id };
  const printSchool = await createPrintSchool({
    hubId: scope.hubId,
    schoolName: `Copy school ${surveyCode}`,
  });
  removeSchool = printSchool.remove;
  const { versionId, id: surveyId } = await createPublishedSurvey({
    code: surveyCode,
    implementerId: scope.implementerId,
    projectId: scope.projectId,
    createdBy: scope.userId,
    form: PRINT_FORM,
  });
  return { scope, versionId, surveyId, schoolId: printSchool.schoolId };
}

async function scannedCopy(reads?: typeof CLEAN_PRINT_FORM_READS) {
  setup ??= await surveyForCopies();
  const copy = await createScannedCopy({ ...setup, reads });
  copyRemovals.push(copy.remove);
  const [stored] = await db
    .select({ serial: surveyQuestionnaire.serial, printRunId: surveyQuestionnaire.printRunId })
    .from(surveyQuestionnaire)
    .where(eq(surveyQuestionnaire.id, copy.questionnaireId));
  if (!stored) throw new Error("The copy was not issued");
  return {
    ...copy,
    ...stored,
    surveyId: setup.surveyId,
    url: getUrl(`/admin/surveys/copies/${copy.questionnaireId}`),
  };
}

test.afterAll(async () => {
  for (const remove of copyRemovals) {
    // oxlint-disable-next-line eslint/no-await-in-loop -- one copy's rows at a time
    await remove();
  }
  await removeSurvey({ code: surveyCode });
  await removeSchool?.();
});

test("R-SURV-COPY: a Research admin opens a copy from its print run and verifies it", async ({
  page,
  context,
}) => {
  const copy = await scannedCopy(CLEAN_PRINT_FORM_READS);
  await signInWithEmail(context, researchAdminEmail);
  await page.goto(getUrl(`/admin/surveys/${copy.surveyId}/runs/${copy.printRunId}`));
  await page.getByRole("link", { name: copy.serial }).click();

  await expect(page.getByRole("heading", { name: copy.serial, level: 1 })).toBeVisible();
  await expect(page.getByRole("heading", { name: /^Page 2/ })).toBeVisible();
  await expect(page.getByText("How old are you?")).toBeVisible();
  await expect(page.getByText("14", { exact: true })).toBeVisible();
  const state = page.getByRole("region", { name: "Copy status" });
  await expect(state).toContainText("Every page is scanned and every answer checked.");

  await state.getByRole("button", { name: "Verify copy" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("Its answers lock.");
  await dialog.getByRole("button", { name: "Verify copy" }).click();
  await expect(dialog).not.toBeVisible();

  await page.reload();
  await expect(page.getByText("Verified", { exact: true })).toBeVisible();
  await expect(state).toContainText("Verified by");
  await expect(state.getByRole("button", { name: "Reopen" })).toBeVisible();
  await expect(
    page.getByRole("region", { name: "History" }).getByRole("listitem").first(),
  ).toContainText("verified the copy");
});

test("R-SURV-COPY: reopening a verified copy needs a reason, which its history keeps", async ({
  page,
  context,
}) => {
  const copy = await scannedCopy(CLEAN_PRINT_FORM_READS);
  // Verified in setup; the test above verifies through the page.
  await db
    .update(surveyQuestionnaire)
    .set({ status: "VERIFIED" })
    .where(eq(surveyQuestionnaire.id, copy.questionnaireId));
  await signInWithEmail(context, researchAdminEmail);
  await page.goto(copy.url);

  await page.getByRole("button", { name: "Reopen" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Reopen copy" }).click();
  await expect(dialog.getByText("Say why this copy is reopened")).toBeVisible();
  await dialog.getByLabel("Reason").fill("The age on page 2 looks misread");
  await dialog.getByRole("button", { name: "Reopen copy" }).click();
  await expect(dialog).not.toBeVisible();

  await page.reload();
  await expect(page.getByText("Ready", { exact: true })).toBeVisible();
  const latest = page.getByRole("region", { name: "History" }).getByRole("listitem").first();
  await expect(latest).toContainText("reopened the copy");
  await expect(latest).toContainText("The age on page 2 looks misread");
});

test("R-SURV-COPY: a copy with answers waiting says how many, and offers no Verify", async ({
  page,
  context,
}) => {
  const copy = await scannedCopy();
  await signInWithEmail(context, researchAdminEmail);
  await page.goto(copy.url);

  const state = page.getByRole("region", { name: "Copy status" });
  await expect(state).toContainText("3 answers still need review.");
  await expect(page.getByRole("button", { name: "Verify copy" })).not.toBeVisible();
  await expect(page.getByRole("link", { name: "Needs review", exact: true })).toHaveCount(3);

  await state.getByRole("link", { name: "Review them" }).click();
  const panel = page.getByRole("article");
  await expect(panel.getByRole("heading", { name: "How are you feeling today?" })).toBeVisible();
  await panel.getByRole("link", { name: copy.serial }).click();
  await expect(page).toHaveURL(copy.url);
  await expect(page.getByRole("heading", { name: copy.serial, level: 1 })).toBeVisible();
});
