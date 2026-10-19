import { type BrowserContext, expect, type Page, test } from "@playwright/test";
import { eq, inArray } from "drizzle-orm";

import { db } from "#/db/client";
import { survey, surveyVersion } from "#/db/schema";
import { careAdminEmail, researchAdminEmail } from "#/db/seed/fixtures";
import type { SurveyForm } from "#/lib/survey/form";
import { signInWithEmail } from "#/tests/helpers";
import { getUrl } from "#/tests/pages/helpers";

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

const TWO_QUESTIONS: SurveyForm = {
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
          options: ["1", "2", "3", "4", "5"].map((code) => ({ code, label: code })),
        },
        {
          id: "notes",
          kind: "text",
          key: "notes",
          prompt: "Anything else?",
          required: false,
          lines: 1,
        },
      ],
    },
  ],
};

/** A survey whose v1 is published with one page of two questions, created straight in the DB. */
async function createPublishedSurvey(
  scope: { implementerId: string; projectId: string },
  userId: string,
) {
  const code = uniqueCode();
  const created = only(
    await db
      .insert(survey)
      .values({
        ...scope,
        code,
        // The code is unique, so the title is too, even across tests running in parallel.
        title: `Published ${code}`,
        createdBy: userId,
      })
      .returning(),
  );
  const version = only(
    await db
      .insert(surveyVersion)
      .values({ surveyId: created.id, versionNumber: 1, createdBy: userId, form: TWO_QUESTIONS })
      .returning(),
  );
  await db
    .update(surveyVersion)
    .set({ status: "PUBLISHED" })
    .where(eq(surveyVersion.id, version.id));
  return created;
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
  await expect(outlinePage(page, 1).getByRole("listitem")).toHaveText([
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

function outlinePage(page: Page, pageNumber: number) {
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
  await page.getByLabel("Page title").fill("About you");
  await addItem(page, 1, "Heading");
  await page.getByLabel("Text").fill("About you");
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

  await expect(outlinePage(page, 1)).toContainText("About you");
  await expect(outlinePage(page, 1).getByRole("listitem")).toHaveText([
    /Heading.*About you/,
    /Number.*how_old_are_you.*How old are you\?/,
    /Single choice.*how_do_you_feel_today.*How do you feel today\?/,
    /Date.*date_of_birth.*Date of birth/,
    /Grid.*over_the_last_two_weeks.*Over the last two weeks/,
  ]);
  await expect(outlinePage(page, 2).getByRole("listitem")).toHaveText([
    /Paragraph.*Tell us more\./,
    /Multiple choice.*which_clubs_are_you_in/,
    /Text.*anything_else.*Anything else\?/,
    /Divider/,
    /Signature.*signature.*Signature/,
  ]);

  await page.getByRole("button", { name: /Over the last two weeks/ }).click();
  await expect(page.getByLabel("Row 2 label")).toHaveValue("Feeling down");
  await page.getByRole("button", { name: /How old are you/ }).click();
  await expect(page.getByLabel("Digits")).toHaveValue("3");
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

  await expect(outlinePage(page, 1).getByRole("listitem")).toHaveText([/notes/]);
  await expect(outlinePage(page, 2).getByRole("listitem")).toHaveText([/mood.*How do you feel/]);
  await page.getByRole("button", { name: /How do you feel today/ }).click();
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
  for (const name of ["Save", "Add page", "Add item to page 1", "Delete", "Move up"]) {
    await expect(page.getByRole("button", { name, exact: true })).toHaveCount(0);
  }
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
