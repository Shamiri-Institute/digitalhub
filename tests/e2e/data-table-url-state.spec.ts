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

// The table sorts text lower-cased by code point, as TanStack's text sort does.
function expectNamesDescending(names: string[]) {
  expect(names.length).toBeGreaterThan(1);
  const lowerCased = names.map((name) => name.toLowerCase());
  expect(lowerCased).toEqual(lowerCased.toSorted((a, b) => (a < b ? 1 : a > b ? -1 : 0)));
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

test("a sort in the URL survives a reload and paging", async ({ page }) => {
  const studentsUrl = await openFirstSchoolStudents(page);
  const { status } = pager(page);

  // The table has no sort control, so the sort arrives the way a shared link brings it.
  await page.goto(`${studentsUrl}?sort=Student+Name.desc&page=2`);
  await expect(status).toHaveText(/^2 of /);
  const pageTwoNames = await studentNames(page);
  expectNamesDescending(pageTwoNames);

  await page.reload();
  await expect(status).toHaveText(/^2 of /);
  expect(await studentNames(page)).toEqual(pageTwoNames);

  await goToPage(page, 3);
  await expect(page).toHaveURL(/\?sort=Student\+Name\.desc&page=3$/);
  const pageThreeNames = await studentNames(page);
  expectNamesDescending([...pageTwoNames, ...pageThreeNames]);
});

test("a page or sort the list does not have falls back without errors", async ({ page }) => {
  const studentsUrl = await openFirstSchoolStudents(page);
  const { status } = pager(page);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    // TanStack logs an unknown sort column as "[Table] Column with id '...' does not exist."
    if (message.type() === "error" && message.text().includes("[Table]")) {
      errors.push(message.text());
    }
  });

  await page.goto(`${studentsUrl}?page=999`);
  await expect(status).toHaveText(/^([\d,]+) of \1$/);
  await expect(dataRows(page).first()).toBeVisible();

  await page.goto(`${studentsUrl}?page=two&sort=Nickname.desc`);
  await expect(status).toHaveText(/^1 of /);
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
