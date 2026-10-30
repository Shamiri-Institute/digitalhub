import { type Page, expect, test } from "@playwright/test";

import { compareCellValues } from "#/lib/table-view";
import { signInAs } from "#/tests/helpers";
import { chooseRowAction, dataRows, getUrl } from "#/tests/pages/helpers";

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

function pageStatus(page: Page) {
  return page.getByRole("main").getByText(/^\d+ of [\d,]+$/);
}

/** Goes to `pageNumber` through the "Go to page" box, which is lost if typed before hydration. */
async function goToPage(page: Page, pageNumber: number) {
  const box = page.getByRole("main").getByLabel("Page number");
  await expect(async () => {
    await box.fill(String(pageNumber));
    await expect(pageStatus(page)).toHaveText(new RegExp(`^${pageNumber} of `), { timeout: 1000 });
  }).toPass();
}

function studentNameHeader(page: Page) {
  return page.getByRole("columnheader", { name: "Student Name", exact: true });
}

/**
 * Clicks the Student Name header until the column sorts in `direction`. A click before hydration
 * is lost, so each try reads the header first rather than clicking a fixed number of times.
 */
async function sortStudentNames(page: Page, direction: "ascending" | "descending") {
  const header = studentNameHeader(page);
  await expect(async () => {
    if ((await header.getAttribute("aria-sort")) !== direction) {
      await header.getByRole("button").click();
    }
    await expect(header).toHaveAttribute("aria-sort", direction, { timeout: 1000 });
  }).toPass();
}

/** The Student Name cells on the current page, the first visible column. */
function studentNames(page: Page) {
  return dataRows(page).evaluateAll((rows) =>
    rows.map((row) => row.querySelector("td")?.textContent?.trim() ?? ""),
  );
}

const ascending = (names: string[]) => names.toSorted(compareCellValues);
const descending = (names: string[]) => names.toSorted((a, b) => compareCellValues(b, a));

test.beforeEach(async ({ context }) => {
  await signInAs(context, "SUPERVISOR");
});

test("a list sorts by a column header and keeps the sort across a reload", async ({ page }) => {
  await openFirstSchoolStudents(page);
  await expect(studentNameHeader(page)).toHaveAttribute("aria-sort", "none");
  await expect(dataRows(page)).toHaveCount(10);
  // The server lists the most recently updated students first.
  const updatedOrderNames = await studentNames(page);

  await sortStudentNames(page, "ascending");
  await expect(page).toHaveURL(/\/students\?sort=Student\+Name\.asc$/);
  const ascendingNames = await studentNames(page);
  expect(ascendingNames).not.toEqual(updatedOrderNames);
  expect(ascendingNames).toEqual(ascending(ascendingNames));

  await page.reload();
  await expect(studentNameHeader(page)).toHaveAttribute("aria-sort", "ascending");
  await expect(dataRows(page)).toHaveCount(10);
  const reloadedNames = await studentNames(page);
  expect(reloadedNames).toEqual(ascending(reloadedNames));

  await sortStudentNames(page, "descending");
  await expect(page).toHaveURL(/\/students\?sort=Student\+Name\.desc$/);
  const descendingNames = await studentNames(page);
  expect(descendingNames).toEqual(descending(descendingNames));
  expect(descendingNames[0]).not.toEqual(reloadedNames[0]);
});

test("changing the sort from page 2 goes back to page 1", async ({ page }) => {
  await openFirstSchoolStudents(page);
  await goToPage(page, 2);
  await expect(page).toHaveURL(/\/students\?page=2$/);

  await sortStudentNames(page, "ascending");
  await expect(pageStatus(page)).toHaveText(/^1 of /);
  await expect(page).toHaveURL(/\/students\?sort=Student\+Name\.asc$/);

  await goToPage(page, 2);
  await expect(page).toHaveURL(/\/students\?sort=Student\+Name\.asc&page=2$/);
  await sortStudentNames(page, "descending");
  await expect(pageStatus(page)).toHaveText(/^1 of /);
  await expect(page).toHaveURL(/\/students\?sort=Student\+Name\.desc$/);
});

test("a sort the list does not offer leaves it unsorted without errors", async ({ page }) => {
  const studentsUrl = await openFirstSchoolStudents(page);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));

  // Status has no value to sort by, and button is the row's actions menu.
  for (const sort of ["Status.asc", "button.desc", "Student+Name.sideways", "Nowhere.asc"]) {
    await page.goto(`${studentsUrl}?sort=${sort}`);
    await expect(dataRows(page)).toHaveCount(10);
    await expect(studentNameHeader(page)).toHaveAttribute("aria-sort", "none");
  }

  await expect(page.getByText(errorBoundary)).toHaveCount(0);
  expect(errors).toEqual([]);
});
