import { expect, type Page, test } from "@playwright/test";
import { eq, inArray } from "drizzle-orm";

import { db } from "#/db/client";
import { survey, surveyPage, surveyQuestion, surveyVersion } from "#/db/schema";
import { signInAs } from "#/tests/helpers";
import { getUrl } from "#/tests/pages/helpers";

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

async function scopeOf(userId: string) {
  const membership = await db.query.implementerMember.findFirst({
    where: (m, { and, eq }) => and(eq(m.userId, userId), eq(m.role, "RESEARCH")),
  });
  const project = await db.query.project.findFirst({ where: (p, { eq }) => eq(p.isDefault, true) });
  if (!membership || !project) throw new Error("The seed has no research membership or project");
  return { implementerId: membership.implementerId, projectId: project.id };
}

/** A survey whose v1 is published with one page of two questions, created straight in the DB. */
async function createPublishedSurvey(
  scope: { implementerId: string; projectId: string },
  userId: string,
) {
  const created = only(
    await db
      .insert(survey)
      .values({
        ...scope,
        code: uniqueCode(),
        title: `Published ${Date.now()}`,
        createdBy: userId,
      })
      .returning(),
  );
  const version = only(
    await db
      .insert(surveyVersion)
      .values({ surveyId: created.id, versionNumber: 1, createdBy: userId })
      .returning(),
  );
  const page = only(
    await db.insert(surveyPage).values({ versionId: version.id, position: 1 }).returning(),
  );
  await db.insert(surveyQuestion).values([
    {
      versionId: version.id,
      pageId: page.id,
      position: 1,
      key: "mood",
      type: "RATING",
      prompt: "How do you feel today?",
      config: { min: 1, max: 5, minLabel: null, maxLabel: null },
    },
    {
      versionId: version.id,
      pageId: page.id,
      position: 2,
      key: "notes",
      type: "SHORT_TEXT",
      prompt: "Anything else?",
      required: false,
      config: { maxLength: 50 },
    },
  ]);
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

test("a research user creates a survey and it starts with an empty draft", async ({
  page,
  context,
}) => {
  await signInAs(context, "RESEARCH");
  await page.goto(getUrl("/res/survey"));

  const code = uniqueCode();
  const title = `Endline wellbeing ${code}`;
  await page.getByRole("button", { name: "New survey" }).click();
  await page.getByLabel("Title").fill(title);
  await page.getByLabel("Code").fill(code.toLowerCase());
  await page.getByRole("button", { name: "Create survey" }).click();

  await expect(page).toHaveURL(/\/res\/survey\/survey_/);
  await page.reload();
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
  await expect(page.getByText(code, { exact: true })).toBeVisible();
  await expect(versionRow(page, 1)).toContainText("Draft");

  await page.goto(getUrl("/res/survey"));
  await expect(page.getByRole("link", { name: title })).toBeVisible();
});

test("a survey code can only be used once", async ({ page, context }) => {
  const user = await signInAs(context, "RESEARCH");
  const existing = await createPublishedSurvey(await scopeOf(user.id), user.id);
  await page.goto(getUrl("/res/survey"));

  await page.getByRole("button", { name: "New survey" }).click();
  await page.getByLabel("Title").fill("Duplicate code");
  await page.getByLabel("Code").fill(existing.code);
  await page.getByRole("button", { name: "Create survey" }).click();

  await expect(page.getByText("A survey with this code already exists").first()).toBeVisible();
});

test("a new draft copies a published version with its question keys", async ({ page, context }) => {
  const user = await signInAs(context, "RESEARCH");
  const published = await createPublishedSurvey(await scopeOf(user.id), user.id);
  await page.goto(getUrl(`/res/survey/${published.id}`));

  await page.getByLabel("Actions for v1").click();
  await page.getByRole("menuitem", { name: "New draft from v1" }).click();
  await expect(page.getByText("Created draft v2").first()).toBeVisible();

  await page.reload();
  const v2 = versionRow(page, 2);
  await expect(v2).toContainText("Draft");
  await expect(v2).toContainText("v1");
  await expect(v2.getByRole("cell", { name: "2", exact: true }).first()).toBeVisible();

  // Question keys are not shown on any page yet; they decide which answers line up across versions.
  const keys = await db
    .select({ versionNumber: surveyVersion.versionNumber, key: surveyQuestion.key })
    .from(surveyQuestion)
    .innerJoin(surveyVersion, eq(surveyVersion.id, surveyQuestion.versionId))
    .where(eq(surveyVersion.surveyId, published.id))
    .orderBy(surveyVersion.versionNumber, surveyQuestion.key);
  expect(keys).toEqual([
    { versionNumber: 1, key: "mood" },
    { versionNumber: 1, key: "notes" },
    { versionNumber: 2, key: "mood" },
    { versionNumber: 2, key: "notes" },
  ]);
});

test("a survey of another implementer is not found", async ({ page, context }) => {
  const user = await signInAs(context, "RESEARCH");
  const { implementerId, projectId } = await scopeOf(user.id);
  const other = await db.query.implementer.findFirst({
    where: (i, { ne }) => ne(i.id, implementerId),
    columns: { id: true },
  });
  if (!other) throw new Error("The seed has a single implementer");
  const foreign = await createPublishedSurvey({ implementerId: other.id, projectId }, user.id);

  const response = await page.goto(getUrl(`/res/survey/${foreign.id}`));
  expect(response?.status()).toBe(404);

  await page.goto(getUrl("/res/survey"));
  await expect(page.getByRole("link", { name: foreign.title })).toHaveCount(0);
});
