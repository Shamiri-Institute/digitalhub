import { and, asc, eq, isNull } from "drizzle-orm";

import { db } from "#/db/client";
import { hub, project } from "#/db/schema";
import { researchAdminEmail } from "#/db/seed/fixtures";
import { expect, test } from "#/tests/fixtures";
import { signInAs, signInWithEmail } from "#/tests/helpers";
import { getUrl } from "#/tests/pages/helpers";
import {
  createPrintSchool,
  createPublishedSurvey,
  createScannedCopy,
  removeSurvey,
} from "#/tests/survey-fixtures";
import { PRINT_FORM } from "#/tests/unit/fixtures/survey-print-form";

/**
 * Research admins review the answers a scan left unsure. Each test reviews a copy of its own,
 * made as a scan makes one: an unclear mood, an age past the form's maximum, unread notes.
 */

// Each worker loads this file on its own, so each makes a survey with a code of its own.
const surveyCode = `V${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
const copyRemovals: (() => Promise<void>)[] = [];
let removeSchool: (() => Promise<void>) | undefined;
let setup: Awaited<ReturnType<typeof surveyForReview>> | undefined;

async function surveyForReview() {
  const [[researchHub], user] = await Promise.all([
    db
      .select({ hubId: hub.id, implementerId: hub.implementerId, projectId: hub.projectId })
      .from(hub)
      .innerJoin(project, eq(project.id, hub.projectId))
      .where(and(eq(project.isDefault, true), isNull(hub.archivedAt)))
      .orderBy(asc(hub.id))
      .limit(1),
    db.query.user.findFirst({ where: (u, { eq }) => eq(u.email, researchAdminEmail) }),
  ]);
  const admin = await db.query.adminUser.findFirst({
    where: (a, { eq }) => eq(a.email, researchAdminEmail),
  });
  if (!researchHub || !user || !admin) throw new Error("The seed has no Research team admin");
  const scope = { ...researchHub, implementerId: admin.implementerId, userId: user.id };
  const printSchool = await createPrintSchool({
    hubId: scope.hubId,
    schoolName: `Review school ${surveyCode}`,
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

async function scannedCopy() {
  setup ??= await surveyForReview();
  const copy = await createScannedCopy(setup);
  copyRemovals.push(copy.remove);
  return {
    ...copy,
    reviewUrl: (field: string) =>
      getUrl(`/admin/surveys/review?survey=${setup?.surveyId}&answer=${copy.answerId(field)}`),
  };
}

test.afterAll(async () => {
  // The copies' answers and scans, then the survey and its copies, then the school they name.
  for (const remove of copyRemovals) {
    // oxlint-disable-next-line eslint/no-await-in-loop -- one copy's rows at a time
    await remove();
  }
  await removeSurvey({ code: surveyCode });
  await removeSchool?.();
});

test("R-SURV-REVIEW: a Research admin corrects an unsure answer and sees it after a reload", async ({
  page,
  context,
}) => {
  const copy = await scannedCopy();
  await signInWithEmail(context, researchAdminEmail);
  await page.goto(copy.reviewUrl("mood"));

  const panel = page.getByRole("article");
  await expect(panel.getByRole("heading", { name: "How are you feeling today?" })).toBeVisible();
  await expect(panel.getByText("Unclear marking")).toBeVisible();
  await expect(panel.getByText("The pipeline read nothing definite")).toBeVisible();
  // Nothing definite was read, so the choice open to the reviewer is to confirm a blank or mark one.
  await expect(panel.getByRole("button", { name: "Accept as blank" })).toBeEnabled();

  await panel.getByRole("radio", { name: "2" }).click();
  await panel.getByRole("button", { name: "Save correction" }).click();
  // Saving moves on to the next answer in the queue.
  await expect(panel.getByRole("heading", { name: "How old are you?" })).toBeVisible();

  await page.goto(copy.reviewUrl("mood"));
  await expect(panel.getByRole("radio", { name: "2" })).toBeChecked();
  await expect(panel.getByText("Corrected", { exact: true })).toBeVisible();
  await expect(panel.getByText("Read by the pipeline as nothing definite")).toBeVisible();
  await expect(panel.getByRole("listitem").filter({ hasText: "corrected" })).toContainText(
    /corrected Blank to 2/,
  );
});

test("R-SURV-REVIEW: a correction the question's rules refuse shows why, and nothing is saved", async ({
  page,
  context,
}) => {
  const copy = await scannedCopy();
  await signInWithEmail(context, researchAdminEmail);
  await page.goto(copy.reviewUrl("age"));

  const panel = page.getByRole("article");
  await panel.getByLabel("Digits as written").fill("121");
  await panel.getByRole("button", { name: "Save correction" }).click();
  await expect(panel.getByRole("alert")).toHaveText("use a number from 0 to 120");

  await page.reload();
  await expect(panel.getByLabel("Digits as written")).toHaveValue("150");
  await expect(panel.getByText("not reviewed yet")).toBeVisible();
});

test("R-SURV-REVIEW: hub coordinators can't open the review queue", async ({ page, context }) => {
  await signInAs(context, "HUB_COORDINATOR");
  await page.goto(getUrl("/admin/surveys/review"));

  await expect(page).not.toHaveURL(/\/admin\/surveys\/review/);
  await expect(page.getByRole("heading", { name: "Surveys" })).not.toBeVisible();
});
