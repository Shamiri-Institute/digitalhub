import { type Page, expect, test } from "@playwright/test";

import { required, signInAs } from "#/tests/helpers";
import { chooseRowAction, dataRows, getUrl, searchRows } from "#/tests/pages/helpers";

const errorBoundary = "Oops! Something went wrong!";

/** The seeded school students page, which runs to 70+ pages of ten, without a query. */
async function openFirstSchoolStudents(page: Page) {
  await page.goto(getUrl("/sc/schools"));
  const firstSchool = dataRows(page).first();
  await expect(firstSchool, "/sc/schools lists no schools").toBeVisible();
  await chooseRowAction(page, firstSchool, "View school");
  await expect(async () => {
    await page.getByRole("radio", { name: "Select Students", exact: true }).click();
    await expect(page).toHaveURL(/\/sc\/schools\/[^/?]+\/students$/, { timeout: 2000 });
  }).toPass();
  return page.url();
}

function pager(page: Page) {
  const main = page.getByRole("main");
  return {
    status: main.getByText(/^\d+ of [\d,]+$/),
    pageNumber: main.getByLabel("Page number"),
    pageSize: main.getByRole("combobox").filter({ hasText: /^Show \d+$/ }),
  };
}

/** Goes to `pageNumber` through the "Go to page" box, which is lost if typed before hydration. */
async function goToPage(page: Page, pageNumber: number) {
  const { status, pageNumber: box } = pager(page);
  await expect(async () => {
    await box.fill(String(pageNumber));
    await expect(status).toHaveText(new RegExp(`^${pageNumber} of `), { timeout: 1000 });
  }).toPass();
}

/** The Student Name cells on the current page, the first visible column. */
function studentNames(page: Page) {
  return dataRows(page).evaluateAll((rows) =>
    rows.map((row) => row.querySelector("td")?.textContent?.trim() ?? ""),
  );
}

test.beforeEach(async ({ context }) => {
  await signInAs(context, "SUPERVISOR");
});

test("a list keeps its page across a reload and back/forward", async ({ page }) => {
  await openFirstSchoolStudents(page);
  const { status, pageNumber } = pager(page);

  await goToPage(page, 2);
  await expect(page).toHaveURL(/\/students\?page=2$/);

  await page.reload();
  await expect(status).toHaveText(/^2 of /);
  await expect(pageNumber).toHaveValue("2");

  await expect(async () => {
    await page.getByRole("radio", { name: "Select Groups", exact: true }).click();
    await expect(page).toHaveURL(/\/groups$/, { timeout: 2000 });
  }).toPass();
  await page.goBack();
  await expect(page).toHaveURL(/\/students\?page=2$/);
  await expect(status).toHaveText(/^2 of /);
});

test("a list keeps its page size with its page across a reload", async ({ page }) => {
  await openFirstSchoolStudents(page);
  const { status, pageNumber, pageSize } = pager(page);

  await goToPage(page, 3);
  await pageSize.click();
  await page.getByRole("option", { name: "Show 20", exact: true }).click();
  // The new size keeps the top row in view, so row 21 now opens page 2.
  await expect(status).toHaveText(/^2 of /);
  await expect(page).toHaveURL(/\/students\?page=2&size=20$/);
  await expect(dataRows(page)).toHaveCount(20);

  await page.reload();
  await expect(status).toHaveText(/^2 of /);
  await expect(pageNumber).toHaveValue("2");
  await expect(pageSize).toHaveText("Show 20");
  await expect(dataRows(page)).toHaveCount(20);
});

test("the pager's arrows move one page and mark the page shown", async ({ page }) => {
  await openFirstSchoolStudents(page);
  const { status } = pager(page);
  const pagination = page.getByRole("main").getByRole("navigation", { name: "Pagination" });
  const previous = pagination.getByRole("button", { name: "Previous page" });
  const next = pagination.getByRole("button", { name: "Next page" });
  const currentPage = pagination.locator("[aria-current=page]");

  await goToPage(page, 3);
  await expect(currentPage).toHaveText("3");
  // The page shown is marked, not a button that changes the page.
  await expect(pagination.getByRole("button", { name: "3", exact: true })).toHaveCount(0);

  await next.click();
  await expect(status).toHaveText(/^4 of /);
  await expect(currentPage).toHaveText("4");
  await expect(page).toHaveURL(/\/students\?page=4$/);

  await previous.click();
  await previous.click();
  await expect(status).toHaveText(/^2 of /);
  await expect(currentPage).toHaveText("2");

  await previous.click();
  await expect(status).toHaveText(/^1 of /);
  await expect(previous).toBeDisabled();
  await expect(next).toBeEnabled();
});

test("a search that matches nothing shows the empty message and no pager", async ({ page }) => {
  const studentsUrl = await openFirstSchoolStudents(page);
  const { status, pageNumber, pageSize } = pager(page);
  await page.goto(studentsUrl);
  await expect(status).toHaveText(/^1 of /);

  const matches = await searchRows(page, `no-such-student-${Date.now()}`);
  await expect(matches).toHaveCount(0);
  await expect(
    page.getByRole("main").getByRole("cell", { name: "No students found" }),
  ).toBeVisible();
  await expect(status).toBeHidden();
  await expect(pageNumber).toBeHidden();
  await expect(pageSize).toBeHidden();
  await expect(page.getByRole("main").getByRole("navigation", { name: "Pagination" })).toBeHidden();
});

test("a page or size the list does not offer falls back without errors", async ({ page }) => {
  const studentsUrl = await openFirstSchoolStudents(page);
  const { status, pageSize } = pager(page);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));

  await page.goto(`${studentsUrl}?page=999&size=50`);
  await expect(status).toHaveText(/^([\d,]+) of \1$/);
  await expect(pageSize).toHaveText("Show 50");
  await expect(dataRows(page).first()).toBeVisible();

  await page.goto(`${studentsUrl}?page=two&size=7`);
  await expect(status).toHaveText(/^1 of /);
  await expect(pageSize).toHaveText("Show 10");
  await expect(dataRows(page)).toHaveCount(10);

  await expect(page.getByText(errorBoundary)).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("searching a list writes no search text to the URL", async ({ page }) => {
  const studentsUrl = await openFirstSchoolStudents(page);
  const { status } = pager(page);
  await page.goto(`${studentsUrl}?page=2`);
  await expect(status).toHaveText(/^2 of /);
  const [studentName] = await studentNames(page);
  required(studentName, "a second page of students in the supervisor's first school");

  const matches = await searchRows(page, studentName);
  await expect(matches.first()).toBeVisible();
  // The search goes back to the first page, which leaves the URL with no query at all.
  await expect(status).toHaveText(/^1 of /);
  await expect(page).toHaveURL(/\/students$/);
});
