import type { BrowserContext, Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { and, eq, inArray } from "drizzle-orm";
import { PDFDocument } from "pdf-lib";

import { db } from "#/db/client";
import {
  adminUser,
  hub,
  project,
  school,
  student,
  survey,
  surveyAuditEvent,
  surveyVersion,
} from "#/db/schema";
import { careAdminEmail, researchAdminEmail } from "#/db/seed/fixtures";
import { objectId } from "#/lib/crypto";
import type { SurveyForm } from "#/lib/survey/form";
import { recordPrintRun } from "#/lib/survey/print-run";
import { expect, test } from "#/tests/fixtures";
import { createAdminCopy, emailForProfile, required, signInWithEmail } from "#/tests/helpers";
import { decodedQrCodes, pageTexts } from "#/tests/print-pdf";
import {
  createPrintSchool,
  createPublishedSurvey as createSurveyFixture,
  removeSurvey,
  TWO_QUESTIONS,
} from "#/tests/survey-fixtures";
import { getUrl, searchRows } from "#/tests/pages/helpers";
import { PRINT_FORM } from "#/tests/unit/fixtures/survey-print-form";

/**
 * Super admins and Research team admins manage surveys; other admins do not see them. The seed
 * makes `researchAdminEmail` a Research team admin and `careAdminEmail` a Care team admin
 * (db/seed/fixtures.ts).
 */

/** The single row an insert returned. */
function only<T>(rows: T[]): T {
  const [row] = rows;
  if (!row) throw new Error("The insert returned no row");
  return row;
}

// Every survey a test creates, removed afterwards with its versions, pages and questions. Their
// audit events stay: the history is append-only by design.
const createdCodes: string[] = [];

test.afterAll(async () => {
  if (createdCodes.length > 0) {
    await db.delete(survey).where(inArray(survey.code, createdCodes));
  }
});

function uniqueCode() {
  const code = `E${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  createdCodes.push(code);
  return code;
}

/** Signs in as the Research team admin; returns their user id and the scope they work in. */
async function signInAsResearchAdmin(context: BrowserContext) {
  await signInWithEmail(context, researchAdminEmail);
  const [admin, user, project] = await Promise.all([
    db.query.adminUser.findFirst({ where: (a, { eq }) => eq(a.email, researchAdminEmail) }),
    db.query.user.findFirst({ where: (u, { eq }) => eq(u.email, researchAdminEmail) }),
    db.query.project.findFirst({ where: (p, { eq }) => eq(p.isDefault, true) }),
  ]);
  if (!admin || !user || !project) throw new Error("The seed has no Research team admin");
  return { userId: user.id, scope: { implementerId: admin.implementerId, projectId: project.id } };
}

/** A survey in the admin's scope whose v1 is published with one page of two questions. */
function createPublishedSurvey(
  scope: { implementerId: string; projectId: string },
  userId: string,
) {
  return createSurveyFixture({ ...scope, code: uniqueCode(), createdBy: userId });
}

function versionRow(page: Page, versionNumber: number) {
  return page
    .getByRole("row")
    .filter({ has: page.getByRole("cell", { name: `v${versionNumber}`, exact: true }) });
}

test("R-SURV-ACCESS, R-SURV-CREATE: a Research team admin creates a survey and it starts with an empty draft", async ({
  page,
  context,
}) => {
  await signInAsResearchAdmin(context);
  await page.goto(getUrl("/admin/schedule"));
  await page.getByRole("link", { name: "Surveys", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/surveys$/);

  const code = uniqueCode();
  const title = `Endline wellbeing ${code}`;
  await page.getByRole("button", { name: "New survey" }).click();
  await page.getByLabel("Title").fill(title);
  await page.getByLabel("Code").fill(code.toLowerCase());
  await page.getByRole("button", { name: "Create survey" }).click();

  await expect(page).toHaveURL(/\/admin\/surveys\/survey_/);
  await page.reload();
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
  await expect(page.getByText(code, { exact: true })).toBeVisible();
  await expect(versionRow(page, 1)).toContainText("Draft");

  await page.goto(getUrl("/admin/surveys"));
  await expect(page.getByRole("link", { name: title })).toBeVisible();
});

test("R-SURV-CREATE: a survey code can only be used once, and must be 2 to 10 letters or digits", async ({
  page,
  context,
}) => {
  const { userId, scope } = await signInAsResearchAdmin(context);
  const existing = await createPublishedSurvey(scope, userId);
  await page.goto(getUrl("/admin/surveys"));

  await page.getByRole("button", { name: "New survey" }).click();
  await page.getByLabel("Title").fill("Duplicate code");
  await page.getByLabel("Code").fill(existing.code);
  await page.getByRole("button", { name: "Create survey" }).click();

  await expect(page.getByText("A survey with this code already exists").first()).toBeVisible();

  // Serials print the code, so it starts with a letter and has no separators.
  await page.getByLabel("Code").fill("9X");
  await page.getByRole("button", { name: "Create survey" }).click();
  await expect(
    page.getByText("Use 2 to 10 letters or digits, starting with a letter"),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/admin\/surveys$/);
});

test("R-SURV-ONE-DRAFT: a new draft copies a published version, and a survey has one draft at a time", async ({
  page,
  context,
}) => {
  const { userId, scope } = await signInAsResearchAdmin(context);
  const published = await createPublishedSurvey(scope, userId);
  await page.goto(getUrl(`/admin/surveys/${published.id}`));

  await page.getByLabel("Actions for v1").click();
  await page.getByRole("menuitem", { name: "New draft from v1" }).click();
  await expect(page.getByText("Created draft v2").first()).toBeVisible();

  await page.reload();
  const v2 = versionRow(page, 2);
  await expect(v2).toContainText("Draft");
  await expect(v2).toContainText("v1");
  await expect(v2.getByRole("cell", { name: "2", exact: true }).first()).toBeVisible();

  // v2 is now the draft, so v1 cannot start another one.
  await page.getByLabel("Actions for v1").click();
  await expect(page.getByRole("menuitem", { name: "New draft from v1" })).toBeDisabled();
  await page.keyboard.press("Escape");

  // The copy keeps v1's questions and their keys, so answers line up across versions.
  await page.getByRole("link", { name: "v2", exact: true }).click();
  await expect((await showPage(page, 1)).getByRole("listitem")).toHaveText([
    /mood.*How do you feel today\?/,
    /notes.*Anything else\?/,
  ]);
});

test("R-SURV-SCOPE: a survey of another implementer is not found", async ({ page, context }) => {
  const { userId, scope } = await signInAsResearchAdmin(context);
  const { implementerId, projectId } = scope;
  const other = await db.query.implementer.findFirst({
    where: (i, { ne }) => ne(i.id, implementerId),
    columns: { id: true },
  });
  if (!other) throw new Error("The seed has a single implementer");
  const foreign = await createPublishedSurvey({ implementerId: other.id, projectId }, userId);
  const own = await createPublishedSurvey(scope, userId);

  const response = await page.goto(getUrl(`/admin/surveys/${foreign.id}`));
  expect(response?.status()).toBe(404);

  // The list shows ten rows a page, so search it, and find the caller's own survey first.
  await page.goto(getUrl("/admin/surveys"));
  await expect(await searchRows(page, own.title)).toHaveCount(1);
  await expect(await searchRows(page, foreign.title)).toHaveCount(0);
});

test("R-SURV-ACCESS: an admin outside the Research team has no Surveys tab and cannot open surveys", async ({
  page,
  context,
}) => {
  await signInWithEmail(context, careAdminEmail);
  await page.goto(getUrl("/admin/schedule"));
  await expect(page.getByRole("link", { name: "Hubs", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Surveys", exact: true })).toHaveCount(0);

  await page.goto(getUrl("/admin/surveys"));
  await expect(page).toHaveURL(/\/admin\/schedule$/);
});

/** A survey whose v1 is a draft holding `form`, created straight in the DB. */
async function createDraftSurvey(
  scope: { implementerId: string; projectId: string },
  userId: string,
  form: SurveyForm,
) {
  const code = uniqueCode();
  const created = only(
    await db
      .insert(survey)
      .values({ ...scope, code, title: `Draft ${code}`, createdBy: userId })
      .returning(),
  );
  await db
    .insert(surveyVersion)
    .values({ surveyId: created.id, versionNumber: 1, createdBy: userId, form });
  return created;
}

/** Shows a page by its tab, with every item card closed, and returns the page's items. */
async function showPage(page: Page, pageNumber: number) {
  await page
    .getByRole("navigation", { name: "Pages" })
    .getByRole("button", { name: new RegExp(`^Page ${pageNumber}(?!\\d)`) })
    .click();
  return page.getByRole("region", { name: `Page ${pageNumber}`, exact: true });
}

async function addItem(page: Page, pageNumber: number, kind: string, prompt?: string) {
  await page.getByRole("button", { name: `Add item to page ${pageNumber}` }).click();
  await page.getByRole("menuitem", { name: kind, exact: true }).click();
  if (prompt !== undefined) {
    await page.getByLabel("Prompt").fill(prompt);
  }
}

async function save(page: Page) {
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("All changes saved")).toBeVisible();
}

test("R-SURV-SAVE: the builder saves an unfinished form of several pages and every item kind", async ({
  page,
  context,
}) => {
  const { userId, scope } = await signInAsResearchAdmin(context);
  const draft = await createDraftSurvey(scope, userId, { format: 1, pages: [] });
  await page.goto(getUrl(`/admin/surveys/${draft.id}`));
  await page.getByRole("link", { name: "v1", exact: true }).click();
  await expect(page).toHaveURL(/\/versions\/1$/);
  await expect(page.getByText("This form has no pages yet")).toBeVisible();

  await page.getByRole("button", { name: "Add page" }).click();
  // The preview is drawn for the eye only (aria-hidden), so its text is found by its markup.
  const preview = page.locator("figure svg");
  await expect(preview.getByText("Items you add appear here as they print.")).toBeVisible();
  await page.getByLabel("Page title").fill("About you");
  await addItem(page, 1, "Heading");
  await expect(preview.getByText("Heading", { exact: true })).toBeVisible();
  await page.getByLabel("Text").fill("About you");
  await expect(preview.getByText("Heading", { exact: true })).toHaveCount(0);
  await addItem(page, 1, "Number", "How old are you?");
  await page.getByLabel("Digits").fill("3");
  await addItem(page, 1, "Single choice", "How do you feel today?");
  await page.getByLabel("Option 1 label").fill("Low");
  await page.getByLabel("Option 2 label").fill("High");
  await addItem(page, 1, "Date", "Date of birth");
  await addItem(page, 1, "Grid", "Over the last two weeks");
  await page.getByLabel("Row 1 label").fill("Little interest in doing things");
  await page.getByRole("button", { name: "Add row" }).click();
  await page.getByLabel("Row 2 label").fill("Feeling down");

  await page.getByRole("button", { name: "Add page" }).click();
  await addItem(page, 2, "Paragraph");
  await page.getByLabel("Text").fill("Tell us more.");
  await addItem(page, 2, "Multiple choice", "Which clubs are you in?");
  await addItem(page, 2, "Text", "Anything else?");
  await page.getByLabel("Lines").fill("4");
  await addItem(page, 2, "Divider");
  await addItem(page, 2, "Signature", "Signature");
  await page.getByRole("checkbox", { name: "Required" }).check();

  // Leaving with unsaved changes asks first; dismissing stays on the builder.
  // The confirm blocks the click until it is answered, so answer it in the handler.
  let prompt = "";
  page.once("dialog", (dialog) => {
    prompt = dialog.message();
    void dialog.dismiss();
  });
  await page.getByRole("link", { name: draft.title }).click();
  expect(prompt).toContain("unsaved changes");
  await expect(page).toHaveURL(/\/versions\/1(\?page=\d+)?$/);

  // So does the browser's Back button. Dismissed, the navigation is cancelled and never loads.
  prompt = "";
  page.once("dialog", (dialog) => {
    prompt = dialog.message();
    void dialog.dismiss();
  });
  await page.goBack({ timeout: 3000 }).catch(() => null);
  expect(prompt).toContain("unsaved changes");
  await expect(page).toHaveURL(/\/versions\/1(\?page=\d+)?$/);
  await expect(page.getByRole("checkbox", { name: "Required" })).toBeChecked();

  await save(page);
  await page.reload();

  await expect(page.getByRole("button", { name: /^Page 1.*About you/ })).toBeVisible();
  await expect((await showPage(page, 1)).getByRole("listitem")).toHaveText([
    /Heading.*About you/,
    /Number.*how_old_are_you.*How old are you\?/,
    /Single choice.*how_do_you_feel_today.*How do you feel today\?/,
    /Date.*date_of_birth.*Date of birth/,
    /Grid.*over_the_last_two_weeks.*Over the last two weeks/,
  ]);
  await expect((await showPage(page, 2)).getByRole("listitem")).toHaveText([
    /Paragraph.*Tell us more\./,
    /Multiple choice.*which_clubs_are_you_in/,
    /Text.*anything_else.*Anything else\?/,
    /Divider/,
    /Signature.*signature.*Signature/,
  ]);

  await showPage(page, 1);
  await page.getByRole("button", { name: /Over the last two weeks/ }).click();
  await expect(page.getByLabel("Row 2 label")).toHaveValue("Feeling down");
  await page.getByRole("button", { name: /How old are you/ }).click();
  await expect(page.getByLabel("Digits")).toHaveValue("3");
  await showPage(page, 2);
  await page.getByRole("button", { name: /Signature.*Signature/ }).click();
  await expect(page.getByRole("checkbox", { name: "Required" })).toBeChecked();
});

test("R-SURV-KEYS: a duplicate key is rejected on its field", async ({ page, context }) => {
  const { userId, scope } = await signInAsResearchAdmin(context);
  const draft = await createDraftSurvey(scope, userId, TWO_QUESTIONS);
  await page.goto(getUrl(`/admin/surveys/${draft.id}/versions/1`));

  await page.getByRole("button", { name: /Anything else/ }).click();
  await page.getByLabel("Key").fill("mood");
  await page.getByRole("button", { name: "Save", exact: true }).click();

  await expect(page.getByLabel("Key")).toHaveAccessibleDescription(
    "Another question already uses this key",
  );
  await expect(page.getByText("Unsaved changes")).toBeVisible();
});

test("R-SURV-KEYS: a draft keeps the keys of its published version; new questions take any key", async ({
  page,
  context,
}) => {
  const { userId, scope } = await signInAsResearchAdmin(context);
  const published = await createPublishedSurvey(scope, userId);
  await db.insert(surveyVersion).values({
    surveyId: published.id,
    versionNumber: 2,
    basedOnVersionId: only(
      await db
        .select({ id: surveyVersion.id })
        .from(surveyVersion)
        .where(eq(surveyVersion.surveyId, published.id)),
    ).id,
    createdBy: userId,
    form: TWO_QUESTIONS,
  });
  await page.goto(getUrl(`/admin/surveys/${published.id}/versions/2`));

  await page.getByRole("button", { name: /How do you feel today/ }).click();
  await expect(page.getByLabel("Key")).toBeDisabled();
  await expect(page.getByText("Published in v1, so it can't change")).toBeVisible();
  // Answers to v1 store its option codes, so they stay; their labels can still change.
  await expect(page.getByLabel("Option 1 code")).toBeDisabled();
  await expect(page.getByLabel("Option 1 label")).toBeEnabled();
  await expect(page.getByRole("button", { name: "Remove option 1" })).toBeDisabled();

  await addItem(page, 1, "Single choice", "How much energy do you have?");
  await page.getByLabel("Key").fill("energy");
  await save(page);
  await page.reload();

  await page.getByRole("button", { name: /How much energy/ }).click();
  await expect(page.getByLabel("Key")).toHaveValue("energy");
  await expect(page.getByLabel("Key")).toBeEnabled();
});

test("R-SURV-SAVE: saving from a stale tab is refused, and each save is audited once", async ({
  page,
  context,
}) => {
  const { userId, scope } = await signInAsResearchAdmin(context);
  const draft = await createDraftSurvey(scope, userId, TWO_QUESTIONS);
  const url = getUrl(`/admin/surveys/${draft.id}/versions/1`);
  const other = await context.newPage();
  await Promise.all([page.goto(url), other.goto(url)]);

  await other.getByRole("button", { name: /Anything else/ }).click();
  await other.getByLabel("Prompt").fill("Anything else to tell us?");
  await save(other);

  await page.getByRole("button", { name: /Anything else/ }).click();
  await page.getByLabel("Prompt").fill("Any other comments?");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(
    page.getByText("This draft was changed elsewhere since you opened it"),
  ).toBeVisible();

  await other.reload();
  await expect(other.getByRole("button", { name: /Anything else to tell us/ })).toBeVisible();

  // No page shows the audit history: the one stored save wrote one event, the refused one none.
  const formSaves = await db
    .select({ id: surveyAuditEvent.id })
    .from(surveyAuditEvent)
    .where(and(eq(surveyAuditEvent.surveyId, draft.id), eq(surveyAuditEvent.action, "FORM_SAVED")));
  expect(formSaves).toHaveLength(1);
});

/** The last unarchived hub of the admin's project by name, so the admin has to pick it. */
async function lastHubOf(scope: { implementerId: string; projectId: string }) {
  const hubs = await db.query.hub.findMany({
    where: (h, { and, eq, isNull }) =>
      and(
        eq(h.implementerId, scope.implementerId),
        eq(h.projectId, scope.projectId),
        isNull(h.archivedAt),
      ),
    columns: { id: true, hubName: true },
    orderBy: (h, { desc }) => [desc(h.hubName), desc(h.id)],
  });
  const [printedHub] = hubs;
  if (!printedHub || hubs.length < 2) {
    throw new Error("The seed has fewer than two hubs for the Research admin");
  }
  return printedHub;
}

test("R-SURV-RUN-HUB, R-SURV-QR, R-SURV-PREFILL: a Research team admin prints copies for a hub they choose", async ({
  page,
  context,
  undo,
}) => {
  // Waits for the background print job, which CI's 30 s test timeout leaves too little time.
  test.slow();
  const { userId, scope } = await signInAsResearchAdmin(context);
  const printedHub = await lastHubOf(scope);
  const published = await createSurveyFixture({
    ...scope,
    code: uniqueCode(),
    createdBy: userId,
    prefill: "SCHOOL",
  });
  const printedSchool = await createPrintSchool({
    hubId: printedHub.id,
    schoolName: `Print ${published.code}`,
  });
  // Undo runs last-registered first: the survey, with its runs and copies, then the school.
  undo(printedSchool.remove, () => removeSurvey({ id: published.id }));

  await page.goto(getUrl(`/admin/surveys/${published.id}`));
  await page.getByLabel("Actions for v1").click();
  await page.getByRole("menuitem", { name: "Print copies" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("combobox", { name: "Hub" }).click();
  await page.getByRole("option", { name: printedHub.hubName, exact: true }).click();
  const copies = dialog.getByLabel(`${printedSchool.schoolName} copies`);
  // R-SURV-RUN-LIMIT: a run has at most 50,000 copies.
  await copies.fill("50001");
  await dialog.getByRole("button", { name: "Continue" }).click();
  await expect(dialog.getByText("At most 50000 copies")).toBeVisible();
  await copies.fill("3");
  await dialog.getByRole("button", { name: "Continue" }).click();
  await expect(dialog.getByText(`for ${printedHub.hubName}`)).toBeVisible();
  await dialog.getByRole("button", { name: "Create print run" }).click();

  await expect(page).toHaveURL(new RegExp(`/admin/surveys/${published.id}/runs/surveyprintrun_`));
  await page.reload();
  // The print job issues the copies in the background, after the run is created.
  await expect(
    page.getByRole("cell", { name: new RegExp(`^${published.code}-\\d{6}$`) }),
  ).toHaveText(
    [`${published.code}-000001`, `${published.code}-000002`, `${published.code}-000003`],
    { timeout: 60_000 },
  );

  const schoolFile = page.getByRole("row").filter({ hasText: "Whole school" });
  await expect(schoolFile).toContainText("Ready", { timeout: 60_000 });
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    schoolFile
      .getByRole("link", { name: `Download ${printedSchool.schoolName} Whole school` })
      .click(),
  ]);
  const printed = new Uint8Array(await readFile(await download.path()));
  const texts = await pageTexts(printed);
  expect(texts).toHaveLength(3 * published.pageCount);
  // Each page names its school (SCHOOL prefill), its page code and the marking guide, and carries
  // the same page id in its top and bottom QR codes, unique across the run.
  const pageCodes = [1, 2, 3].flatMap((copy) =>
    Array.from(
      { length: published.pageCount },
      (_, page) => `${published.code}-${String(copy).padStart(6, "0")}-P${page + 1}`,
    ),
  );
  for (const [index, text] of texts.entries()) {
    expect(text).toContain(printedSchool.schoolName);
    expect(text).toContain(pageCodes[index]);
    expect(text).toContain("Mark your answer:");
  }
  const topCodes = await decodedQrCodes(printed, "top");
  expect(await decodedQrCodes(printed, "bottom")).toEqual(topCodes);
  expect(topCodes.every(Boolean)).toBe(true);
  expect(new Set(topCodes).size).toBe(topCodes.length);

  await page.getByRole("link", { name: published.title }).click();
  const runRow = page.getByRole("row").filter({ hasText: printedHub.hubName });
  // Version shows as "v1", so the only cell that is exactly "3" is Copies.
  await expect(runRow.getByRole("cell", { name: "3", exact: true })).toBeVisible();
});

test("R-SURV-RUN-HUB: an admin is not offered an archived hub to print for", async ({
  page,
  context,
  undo,
}) => {
  const researchAdmin = await db.query.user.findFirst({
    where: (u, { eq }) => eq(u.email, researchAdminEmail),
    columns: { id: true },
  });
  const researchProfile = await db.query.adminUser.findFirst({
    where: (a, { eq }) => eq(a.email, researchAdminEmail),
    columns: { implementerId: true },
  });
  if (!researchAdmin || !researchProfile) throw new Error("Seed the database first");
  const projectId = objectId("proj");
  const hubId = objectId("hub");
  undo(
    () => db.delete(project).where(eq(project.id, projectId)),
    () => db.delete(hub).where(eq(hub.id, hubId)),
  );
  await db
    .insert(project)
    .values({ id: projectId, visibleId: projectId, name: `E2E ${projectId}` });
  // Archived, so the project counts as the admin's but has no hub to print for.
  await db.insert(hub).values({
    id: hubId,
    hubName: `E2E archived ${hubId}`,
    implementerId: researchProfile.implementerId,
    projectId,
    archivedAt: new Date(),
  });
  const copy = await createAdminCopy(researchAdmin.id, projectId);
  undo(copy.remove);
  await db.update(adminUser).set({ team: "RESEARCH" }).where(eq(adminUser.email, copy.email));
  // Made by the seeded admin: its audit events outlive the copy, which is then deleted.
  const published = await createPublishedSurvey(
    { implementerId: researchProfile.implementerId, projectId },
    researchAdmin.id,
  );
  undo(() => db.delete(survey).where(eq(survey.id, published.id)));
  await signInWithEmail(context, copy.email);

  await page.goto(getUrl(`/admin/surveys/${published.id}`));
  await page.getByLabel("Actions for v1").click();
  await page.getByRole("menuitem", { name: "Print copies" }).click();
  await expect(page.getByRole("dialog")).toContainText("No active hubs to print for.");
});

test("R-SURV-READONLY: a published version opens read-only", async ({ page, context }) => {
  const { userId, scope } = await signInAsResearchAdmin(context);
  const published = await createPublishedSurvey(scope, userId);
  await page.goto(getUrl(`/admin/surveys/${published.id}`));
  await page.getByLabel("Actions for v1").click();
  await page.getByRole("menuitem", { name: "View form" }).click();

  await expect(page.getByText("Published versions can't be edited")).toBeVisible();
  await page.getByRole("button", { name: /How do you feel today/ }).click();
  await expect(page.getByLabel("Prompt")).toBeDisabled();
  await expect(page.getByLabel("Key")).toBeDisabled();
  await expect(page.getByText(/to print them bold/)).toHaveCount(0);
  for (const name of ["Save", "Add page", "Add item to page 1", "Delete", "Move up"]) {
    await expect(page.getByRole("button", { name, exact: true })).toHaveCount(0);
  }
});

test("R-SURV-READONLY: a retired version opens read-only and says it is retired", async ({
  page,
  context,
}) => {
  const { userId, scope } = await signInAsResearchAdmin(context);
  const retired = await createPublishedSurvey(scope, userId);
  await db
    .update(surveyVersion)
    .set({ status: "RETIRED" })
    .where(eq(surveyVersion.surveyId, retired.id));
  await page.goto(getUrl(`/admin/surveys/${retired.id}/versions/1`));

  await expect(page.getByText("Retired versions can't be edited")).toBeVisible();
  await expect(page.getByRole("button", { name: "Save", exact: true })).toHaveCount(0);
});

test("a save whose reply was lost is not taken for a change made elsewhere", async ({
  page,
  context,
}) => {
  const { userId, scope } = await signInAsResearchAdmin(context);
  const draft = await createDraftSurvey(scope, userId, TWO_QUESTIONS);
  const url = getUrl(`/admin/surveys/${draft.id}/versions/1`);
  await page.goto(url);

  // The first save reaches the server and is stored, but its reply never arrives.
  let dropReply = true;
  await page.route(url, async (route) => {
    if (dropReply && route.request().method() === "POST") {
      dropReply = false;
      await route.fetch();
      await route.abort();
      return;
    }
    await route.fallback();
  });
  await page.getByRole("button", { name: /Anything else/ }).click();
  await page.getByLabel("Prompt").fill("Anything else to tell us?");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("Sorry, could not save the draft.").first()).toBeVisible();

  await page.getByLabel("Prompt").fill("Any other comments?");
  await save(page);
  await page.reload();
  await expect(page.getByRole("button", { name: /Any other comments/ })).toBeVisible();
});

test("R-SURV-PUBLISH, R-SURV-STATUS, R-SURV-PREFILL: publishing a draft freezes its prefill and makes the survey active", async ({
  page,
  context,
}) => {
  const { userId, scope } = await signInAsResearchAdmin(context);
  const draft = await createDraftSurvey(scope, userId, PRINT_FORM);
  await page.goto(getUrl(`/admin/surveys/${draft.id}/versions/1`));

  await page.getByRole("button", { name: "Publish", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("radio", { name: /School name/ }).click();
  await dialog.getByRole("button", { name: "Continue" }).click();
  await expect(dialog).toContainText("It can't be undone");
  await dialog.getByRole("button", { name: "Publish v1" }).click();
  await expect(page.getByText("Published v1. The survey is now active.").first()).toBeVisible();

  await page.reload();
  await expect(page.getByText("Published versions can't be edited")).toBeVisible();
  await expect(page.getByRole("button", { name: "Publish", exact: true })).toHaveCount(0);
  // The header shows the prefill chosen at publish: the school, and no student.
  const header = page.locator("figure svg text");
  await expect(header.filter({ hasText: /^School$/ })).toHaveCount(1);
  await expect(header.filter({ hasText: /^Student( ID)?$/ })).toHaveCount(0);

  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Sample PDF" }).click();
  const file = await download;
  expect(file.suggestedFilename()).toBe(`${draft.code}-v1-sample.pdf`);
  const pdf = await PDFDocument.load(await readFile(await file.path()));
  expect(pdf.getPageCount()).toBe(PRINT_FORM.pages.length);

  await page.goto(getUrl(`/admin/surveys/${draft.id}`));
  await expect(versionRow(page, 1)).toContainText("Published");
  // The survey was a draft; its first published version makes it active.
  await expect(page.getByText("Active", { exact: true })).toBeVisible();
});

test("R-SURV-PUBLISH: a page that doesn't fit is named and can't be published", async ({
  page,
  context,
}) => {
  const { userId, scope } = await signInAsResearchAdmin(context);
  const text = (id: string) =>
    ({
      id,
      kind: "text",
      key: id,
      prompt: `Tell us about ${id}`,
      required: false,
      lines: 20,
    }) as const;
  const draft = await createDraftSurvey(scope, userId, {
    format: 1,
    pages: [{ items: [text("home")] }, { items: [text("school"), text("friends")] }],
  });
  await page.goto(getUrl(`/admin/surveys/${draft.id}/versions/1`));

  await expect(
    page.getByRole("navigation", { name: "Pages" }).getByRole("button", { name: /^Page 2/ }),
  ).toContainText("Doesn't print");
  await showPage(page, 2);
  const warning =
    "Page 2 doesn't fit on A4: it runs 162 mm past the bottom. Move item 2 (“Tell us about friends”) to another page.";
  await expect(page.locator("figure").getByText(warning)).toBeVisible();
  await expect(page.getByRole("button", { name: "Sample PDF" })).toBeDisabled();

  await page.getByRole("button", { name: "Publish", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("listitem")).toHaveText([warning]);
  await expect(dialog.getByRole("button", { name: "Continue" })).toBeDisabled();
});

test("R-SURV-PUBLISH: an unfinished form can't be published", async ({ page, context }) => {
  const { userId, scope } = await signInAsResearchAdmin(context);
  const draft = await createDraftSurvey(scope, userId, {
    format: 1,
    pages: [
      {
        items: [
          {
            id: "mood",
            kind: "single_choice",
            key: "mood",
            prompt: "How do you feel today?",
            required: true,
            options: [{ code: "1", label: "Fine" }],
          },
        ],
      },
      { items: [] },
    ],
  });
  await page.goto(getUrl(`/admin/surveys/${draft.id}/versions/1`));

  await page.getByRole("button", { name: "Publish", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("listitem")).toContainText([
    /add at least two options/,
    /Page 2 is empty/,
  ]);
  await expect(dialog.getByRole("button", { name: "Continue" })).toBeDisabled();
});

/** A new project of the Research admin's implementer, with an archived hub so it counts as theirs. */
async function createResearchProject(undo: (...steps: (() => Promise<unknown>)[]) => void) {
  const [researchAdmin, researchProfile] = await Promise.all([
    db.query.user.findFirst({
      where: (u, { eq }) => eq(u.email, researchAdminEmail),
      columns: { id: true },
    }),
    db.query.adminUser.findFirst({
      where: (a, { eq }) => eq(a.email, researchAdminEmail),
      columns: { implementerId: true },
    }),
  ]);
  required(researchAdmin, "the Research admin");
  required(researchProfile, "the Research admin's profile");
  const projectId = objectId("proj");
  const hubId = objectId("hub");
  undo(
    () => db.delete(project).where(eq(project.id, projectId)),
    () => db.delete(hub).where(eq(hub.id, hubId)),
  );
  await db
    .insert(project)
    .values({ id: projectId, visibleId: projectId, name: `E2E ${projectId}` });
  await db.insert(hub).values({
    id: hubId,
    hubName: `E2E archived ${hubId}`,
    implementerId: researchProfile.implementerId,
    projectId,
    archivedAt: new Date(),
  });
  const copy = await createAdminCopy(researchAdmin.id, projectId);
  undo(copy.remove);
  await db.update(adminUser).set({ team: "RESEARCH" }).where(eq(adminUser.email, copy.email));
  return {
    projectId,
    implementerId: researchProfile.implementerId,
    researchAdminId: researchAdmin.id,
    copyEmail: copy.email,
  };
}

test("R-SURV-SCOPE: the survey list follows the admin's active project", async ({
  page,
  context,
  undo,
}) => {
  const { scope: defaultScope } = await signInAsResearchAdmin(context);
  const other = await createResearchProject(undo);
  // Made by the seeded admin: its audit events outlive the copy, which is then deleted.
  const inActiveProject = await createPublishedSurvey(
    { implementerId: other.implementerId, projectId: other.projectId },
    other.researchAdminId,
  );
  undo(() => db.delete(survey).where(eq(survey.id, inActiveProject.id)));
  const inDefaultProject = await createPublishedSurvey(defaultScope, other.researchAdminId);
  await context.clearCookies();
  await signInWithEmail(context, other.copyEmail);

  await page.goto(getUrl("/admin/surveys"));
  await expect(await searchRows(page, inActiveProject.title)).toHaveCount(1);
  await expect(await searchRows(page, inDefaultProject.title)).toHaveCount(0);
  const response = await page.goto(getUrl(`/admin/surveys/${inDefaultProject.id}`));
  expect(response?.status()).toBe(404);
});

test("R-SURV-PRINTABLE: only published versions print, for active schools and students", async ({
  page,
  context,
  undo,
}) => {
  const { userId, scope } = await signInAsResearchAdmin(context);
  const printedHub = await lastHubOf(scope);
  const published = await createSurveyFixture({
    ...scope,
    code: uniqueCode(),
    createdBy: userId,
    prefill: "STUDENT",
    versionCount: 2,
  });
  await db
    .update(surveyVersion)
    .set({ status: "RETIRED" })
    .where(and(eq(surveyVersion.surveyId, published.id), eq(surveyVersion.versionNumber, 1)));
  const [activeSchool, archivedSchool, droppedSchool] = await Promise.all(
    ["Active", "Archived", "Dropped"].map((kind) =>
      createPrintSchool({
        hubId: printedHub.id,
        schoolName: `${kind} ${published.code}`,
        studentNames: ["Amy", "Ben", "Cat", "Dan"].map((name) => `${name} ${published.code}`),
      }),
    ),
  );
  required(activeSchool, "the active school");
  required(archivedSchool, "the archived school");
  required(droppedSchool, "the dropped-out school");
  undo(activeSchool.remove, archivedSchool.remove, droppedSchool.remove, () =>
    removeSurvey({ id: published.id }),
  );
  await db
    .update(school)
    .set({ archivedAt: new Date() })
    .where(eq(school.id, archivedSchool.schoolId));
  await db.update(school).set({ droppedOut: true }).where(eq(school.id, droppedSchool.schoolId));
  await db
    .update(student)
    .set({ archivedAt: new Date() })
    .where(eq(student.studentName, `Cat ${published.code}`));
  await db
    .update(student)
    .set({ droppedOut: true })
    .where(eq(student.studentName, `Dan ${published.code}`));

  await page.goto(getUrl(`/admin/surveys/${published.id}`));
  await page.getByLabel("Actions for v1").click();
  await expect(page.getByRole("menuitem", { name: "View form" })).toBeVisible();
  await expect(page.getByRole("menuitem", { name: "Print copies" })).toHaveCount(0);
  await page.keyboard.press("Escape");

  await page.getByLabel("Actions for v2").click();
  await page.getByRole("menuitem", { name: "Print copies" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("combobox", { name: "Hub" }).click();
  await page.getByRole("option", { name: printedHub.hubName, exact: true }).click();
  await expect(dialog.getByText(`${activeSchool.schoolName} (2 active students)`)).toBeVisible();
  await expect(dialog.getByText(archivedSchool.schoolName)).toHaveCount(0);
  await expect(dialog.getByText(droppedSchool.schoolName)).toHaveCount(0);
});

test("R-SURV-RUN-VIEW: a hub coordinator sees only their hub's runs; a Research admin sees every hub's", async ({
  page,
  context,
  browser,
  undo,
}) => {
  const { userId, scope } = await signInAsResearchAdmin(context);
  const hubs = await db.query.hub.findMany({
    where: (h, { and, eq, isNull }) =>
      and(
        eq(h.implementerId, scope.implementerId),
        eq(h.projectId, scope.projectId),
        isNull(h.archivedAt),
      ),
    columns: { id: true, hubName: true },
    with: { coordinators: { columns: { id: true } } },
    orderBy: (h, { asc }) => asc(h.id),
  });
  let coordinator: { email: string; hubId: string } | undefined;
  for (const candidate of hubs) {
    for (const { id } of candidate.coordinators) {
      const email = coordinator ? null : await emailForProfile(id, "HUB_COORDINATOR");
      if (email) coordinator = { email, hubId: candidate.id };
    }
  }
  required(coordinator, "a hub coordinator of a hub in the Research admin's project");
  const coordinatorHubId = coordinator.hubId;
  const otherHub = hubs.find((candidate) => candidate.id !== coordinatorHubId);
  required(otherHub, "a second hub in the Research admin's project");

  const published = await createPublishedSurvey(scope, userId);
  const schools = await Promise.all(
    [coordinatorHubId, otherHub.id].map((hubId) =>
      createPrintSchool({ hubId, schoolName: `Runs ${published.code} ${hubId}` }),
    ),
  );
  undo(...schools.map((printSchool) => printSchool.remove), () =>
    removeSurvey({ id: published.id }),
  );
  const [ownRunId, otherRunId] = await Promise.all(
    schools.map(async (printSchool, index) => {
      const printRunId = objectId("surveyprintrun");
      await db.transaction((tx) =>
        recordPrintRun(
          tx,
          { ...scope, userId, hubId: index === 0 ? coordinatorHubId : otherHub.id },
          {
            printRunId,
            versionId: published.versionId,
            request: { kind: "COUNTS", schools: [{ schoolId: printSchool.schoolId, copies: 1 }] },
          },
        ),
      );
      return printRunId;
    }),
  );

  await page.goto(getUrl(`/admin/surveys/${published.id}`));
  await expect(page.locator(`a[href$="/runs/${ownRunId}"]`)).toHaveCount(1);
  await expect(page.locator(`a[href$="/runs/${otherRunId}"]`)).toHaveCount(1);

  const coordinatorContext = await browser.newContext();
  undo(() => coordinatorContext.close());
  await signInWithEmail(coordinatorContext, coordinator.email);
  const coordinatorPage = await coordinatorContext.newPage();
  await coordinatorPage.goto(getUrl("/hc/surveys"));
  await expect(coordinatorPage.locator(`a[href$="/runs/${ownRunId}"]`)).toHaveCount(1);
  await expect(coordinatorPage.locator(`a[href$="/runs/${otherRunId}"]`)).toHaveCount(0);
  const response = await coordinatorPage.goto(getUrl(`/hc/surveys/runs/${otherRunId}`));
  expect(response?.status()).toBe(404);
});
