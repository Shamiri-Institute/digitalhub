import type { BrowserContext, Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { format } from "date-fns";
import { eq, inArray } from "drizzle-orm";
import { PDFDocument } from "pdf-lib";

import { db } from "#/db/client";
import { adminUser, hub, project, survey, surveyVersion } from "#/db/schema";
import { careAdminEmail, researchAdminEmail } from "#/db/seed/fixtures";
import { objectId } from "#/lib/crypto";
import type { SurveyForm } from "#/lib/survey/form";
import { expect, test } from "#/tests/fixtures";
import { createAdminCopy, signInWithEmail } from "#/tests/helpers";
import {
  createPrintSchool,
  createPublishedSurvey as createSurveyFixture,
  TWO_QUESTIONS,
} from "#/tests/survey-fixtures";
import { getUrl } from "#/tests/pages/helpers";
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

test("a Research team admin creates a survey and it starts with an empty draft", async ({
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

test("a survey code can only be used once", async ({ page, context }) => {
  const { userId, scope } = await signInAsResearchAdmin(context);
  const existing = await createPublishedSurvey(scope, userId);
  await page.goto(getUrl("/admin/surveys"));

  await page.getByRole("button", { name: "New survey" }).click();
  await page.getByLabel("Title").fill("Duplicate code");
  await page.getByLabel("Code").fill(existing.code);
  await page.getByRole("button", { name: "Create survey" }).click();

  await expect(page.getByText("A survey with this code already exists").first()).toBeVisible();
});

test("a new draft copies a published version, and a survey has one draft at a time", async ({
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

test("a survey of another implementer is not found", async ({ page, context }) => {
  const { userId, scope } = await signInAsResearchAdmin(context);
  const { implementerId, projectId } = scope;
  const other = await db.query.implementer.findFirst({
    where: (i, { ne }) => ne(i.id, implementerId),
    columns: { id: true },
  });
  if (!other) throw new Error("The seed has a single implementer");
  const foreign = await createPublishedSurvey({ implementerId: other.id, projectId }, userId);

  const response = await page.goto(getUrl(`/admin/surveys/${foreign.id}`));
  expect(response?.status()).toBe(404);

  await page.goto(getUrl("/admin/surveys"));
  await expect(page.getByRole("link", { name: foreign.title })).toHaveCount(0);
});

test("an admin outside the Research team has no Surveys tab and cannot open surveys", async ({
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

test("the builder saves a form of several pages and every item kind", async ({ page, context }) => {
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
  await page.getByLabel("Required").check();

  // Leaving with unsaved changes asks first; dismissing stays on the builder.
  // The confirm blocks the click until it is answered, so answer it in the handler.
  let prompt = "";
  page.once("dialog", (dialog) => {
    prompt = dialog.message();
    void dialog.dismiss();
  });
  await page.getByRole("link", { name: draft.title }).click();
  expect(prompt).toContain("unsaved changes");
  await expect(page).toHaveURL(/\/versions\/1$/);

  // So does the browser's Back button. Dismissed, the navigation is cancelled and never loads.
  prompt = "";
  page.once("dialog", (dialog) => {
    prompt = dialog.message();
    void dialog.dismiss();
  });
  await page.goBack({ timeout: 3000 }).catch(() => null);
  expect(prompt).toContain("unsaved changes");
  await expect(page).toHaveURL(/\/versions\/1$/);
  await expect(page.getByLabel("Required")).toBeChecked();

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
  await expect(page.getByLabel("Required")).toBeChecked();
});

test("moving a question to another page keeps its key and settings", async ({ page, context }) => {
  const { userId, scope } = await signInAsResearchAdmin(context);
  const form: SurveyForm = { format: 1, pages: [...TWO_QUESTIONS.pages, { items: [] }] };
  const draft = await createDraftSurvey(scope, userId, form);
  await page.goto(getUrl(`/admin/surveys/${draft.id}/versions/1`));

  await page.getByRole("button", { name: /How do you feel today/ }).click();
  await page.getByRole("combobox", { name: "Page", exact: true }).click();
  await page.getByRole("option", { name: "Page 2" }).click();
  await save(page);
  await page.reload();

  await expect((await showPage(page, 1)).getByRole("listitem")).toHaveText([/notes/]);
  const second = await showPage(page, 2);
  await expect(second.getByRole("listitem")).toHaveText([/mood.*How do you feel/]);
  await second.getByRole("button", { name: /How do you feel today/ }).click();
  await expect(page.getByLabel("Key")).toHaveValue("mood");
  await expect(page.getByLabel("Required")).toBeChecked();
  await expect(page.getByLabel("Option 5 code")).toHaveValue("5");
});

test("a duplicate key is rejected on its field", async ({ page, context }) => {
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

test("a draft keeps the keys of its published version; new questions take any key", async ({
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

test("saving from a stale tab reports that the draft changed elsewhere", async ({
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

test("a Research team admin prints copies of a published version for a hub they choose", async ({
  page,
  context,
  undo,
}) => {
  const { userId, scope } = await signInAsResearchAdmin(context);
  const printedHub = await lastHubOf(scope);
  const published = await createPublishedSurvey(scope, userId);
  const printedSchool = await createPrintSchool({
    hubId: printedHub.id,
    schoolName: `Print ${published.code}`,
  });
  // Undo runs last-registered first: the survey, with its runs and copies, then the school.
  undo(printedSchool.remove, () => db.delete(survey).where(eq(survey.id, published.id)));

  await page.goto(getUrl(`/admin/surveys/${published.id}`));
  await page.getByLabel("Actions for v1").click();
  await page.getByRole("menuitem", { name: "Print copies" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("combobox", { name: "Hub" }).click();
  await page.getByRole("option", { name: printedHub.hubName, exact: true }).click();
  await dialog.getByLabel(`${printedSchool.schoolName} copies`).fill("3");
  await dialog.getByRole("button", { name: "Continue" }).click();
  await expect(dialog.getByText(`for ${printedHub.hubName}`)).toBeVisible();
  await dialog.getByRole("button", { name: "Create print run" }).click();

  await expect(page).toHaveURL(new RegExp(`/admin/surveys/${published.id}/runs/surveyprintrun_`));
  await page.reload();
  await expect(
    page.getByRole("cell", { name: new RegExp(`^${published.code}-\\d{6}$`) }),
  ).toHaveText([
    `${published.code}-000001`,
    `${published.code}-000002`,
    `${published.code}-000003`,
  ]);

  await page.getByRole("link", { name: published.title }).click();
  const runRow = page.getByRole("row").filter({ hasText: printedHub.hubName });
  // Version shows as "v1", so the only cell that is exactly "3" is Copies.
  await expect(runRow.getByRole("cell", { name: "3", exact: true })).toBeVisible();
});

test("a print dialog opened on page 2 before the page knows the time zone keeps its input", async ({
  page,
  context,
  undo,
}) => {
  const { userId, scope } = await signInAsResearchAdmin(context);
  const printedHub = await lastHubOf(scope);
  // Eleven versions, newest first, so v1 is on the table's second page.
  const published = await createSurveyFixture({
    ...scope,
    code: uniqueCode(),
    createdBy: userId,
    versionCount: 11,
  });
  const printedSchool = await createPrintSchool({
    hubId: printedHub.id,
    schoolName: `Print ${published.code}`,
  });
  undo(printedSchool.remove, () => db.delete(survey).where(eq(survey.id, published.id)));

  // A first visit has no time zone cookie, so the page sets it and refreshes. The refresh is held
  // until the dialog is open and filled in.
  const surveyPath = `/admin/surveys/${published.id}`;
  let releaseRefresh = () => {};
  const refreshReleased = new Promise<void>((resolve) => {
    releaseRefresh = resolve;
  });
  const isRefresh = (headers: Record<string, string>) =>
    headers.rsc === "1" && !headers["next-router-prefetch"] && !headers["next-action"];
  await page.route(
    (url) => url.pathname === surveyPath,
    async (route) => {
      if (isRefresh(route.request().headers())) {
        await refreshReleased;
      }
      await route.fallback();
    },
  );

  await page.goto(getUrl(surveyPath));
  await page.getByRole("button", { name: "2", exact: true }).click();
  await expect(versionRow(page, 1)).toBeVisible();
  // By CSS, not role: the open dialog hides the page behind it from the accessibility tree.
  const headers = await page.getByRole("columnheader").allInnerTexts();
  const created = page
    .locator("tbody tr")
    .first()
    .locator("td")
    .nth(headers.findIndex((text) => text.trim() === "Created"));
  await expect(created).toHaveText("");
  await page.getByLabel("Actions for v1").click();
  await page.getByRole("menuitem", { name: "Print copies" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("combobox", { name: "Hub" }).click();
  await page.getByRole("option", { name: printedHub.hubName, exact: true }).click();
  const copies = dialog.getByLabel(`${printedSchool.schoolName} copies`);
  await copies.fill("7");

  releaseRefresh();
  await expect(created).toHaveText(format(new Date(), "dd MMM yyyy"));
  await expect(
    dialog.getByRole("heading", { name: `Print copies of ${published.code} v1` }),
  ).toBeVisible();
  await expect(copies).toHaveValue("7");
});

test("an admin whose project has no active hubs is told so in the print dialog", async ({
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

test("a published version opens read-only", async ({ page, context }) => {
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

test("a retired version opens read-only and says it is retired", async ({ page, context }) => {
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

test("after a save, going back to the builder keeps the saved form", async ({ page, context }) => {
  const { userId, scope } = await signInAsResearchAdmin(context);
  const draft = await createDraftSurvey(scope, userId, TWO_QUESTIONS);
  await page.goto(getUrl(`/admin/surveys/${draft.id}`));
  await page.getByRole("link", { name: "v1", exact: true }).click();

  await page.getByRole("button", { name: /Anything else/ }).click();
  await page.getByLabel("Prompt").fill("Anything else to tell us?");
  await save(page);
  await page.getByRole("link", { name: draft.title }).click();
  await expect(page).toHaveURL(new RegExp(`/admin/surveys/${draft.id}$`));
  await page.goBack();

  await page.getByRole("button", { name: /Anything else to tell us/ }).click();
  await page.getByLabel("Prompt").fill("Any other comments?");
  await save(page);
  await page.reload();
  await expect(page.getByRole("button", { name: /Any other comments/ })).toBeVisible();
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

test("bold words and a centred paragraph show in the print preview after a save", async ({
  page,
  context,
}) => {
  const { userId, scope } = await signInAsResearchAdmin(context);
  const draft = await createDraftSurvey(scope, userId, {
    format: 1,
    pages: [{ items: [{ id: "intro", kind: "paragraph", text: "Answer every question" }] }],
  });
  await page.goto(getUrl(`/admin/surveys/${draft.id}/versions/1`));

  await page.getByRole("button", { name: /Answer every question/ }).click();
  await page.getByLabel("Text").fill("Answer **every** question");
  await page.getByRole("radio", { name: "Align centre" }).click();
  await save(page);
  await page.reload();

  // The preview is drawn for the eye only (aria-hidden), so it is found by its markup: an SVG
  // with one <text> per run, in PDF points.
  const runs = page.locator('figure svg text[font-size="10.5"]');
  await expect(runs).toHaveText(["Answer", "every", "question"]);
  await expect(runs.nth(1)).toHaveAttribute("font-weight", "700");
  await expect(runs.first()).toHaveAttribute("font-weight", "400");
  const [left, right] = await runs.evaluateAll((texts) => {
    const xs = texts.map((t) => Number(t.getAttribute("x")));
    const last = texts.at(-1);
    return [
      Math.min(...xs),
      Number(last?.getAttribute("x")) + Number(last?.getAttribute("textLength")),
    ];
  });
  // Centred between the A4 sheet's 24 pt margins.
  expect(((left ?? 0) + (right ?? 0)) / 2).toBeCloseTo(595.28 / 2, 0);
  await expect(page.getByRole("button", { name: /Answer every question/ })).toBeVisible();
});

test("publishing a draft with a prefill freezes it with a sample PDF of every page", async ({
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

test("a page that doesn't fit is named and can't be published", async ({ page, context }) => {
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
    "Page 2 doesn't fit on A4: it runs 153 mm past the bottom. Move item 2 (“Tell us about friends”) to another page.";
  await expect(page.locator("figure").getByText(warning)).toBeVisible();
  await expect(page.getByRole("button", { name: "Sample PDF" })).toBeDisabled();

  await page.getByRole("button", { name: "Publish", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("listitem")).toHaveText([warning]);
  await expect(dialog.getByRole("button", { name: "Continue" })).toBeDisabled();
});
