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

  // The form is not shown on any page yet; its keys decide which answers line up across versions.
  const versions = await db
    .select({ versionNumber: surveyVersion.versionNumber, form: surveyVersion.form })
    .from(surveyVersion)
    .where(eq(surveyVersion.surveyId, published.id))
    .orderBy(surveyVersion.versionNumber);
  expect(versions.map((v) => v.versionNumber)).toEqual([1, 2]);
  expect(versions[1]?.form).toEqual(versions[0]?.form);
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
