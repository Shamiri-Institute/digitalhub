import { expect, test } from "@playwright/test";

import type { Role } from "#/scripts/bench/routes";
import { signInAs } from "#/tests/helpers";
import { dataRows, getUrl } from "#/tests/pages/helpers";

const errorBoundary = "Oops! Something went wrong!";

/**
 * The school drill-down every field role uses: the schools list, "View school" from the row menu,
 * then each tab of the school page. It covers the navigation between the school pages, which the
 * page-by-page render check does not: every tab must keep showing the same school's data.
 *
 * The school tabs are a Radix toggle group, so each tab is a radio named "Select <tab>".
 */
const flows: { role: Role; list: string; tabs: string[] }[] = [
  { role: "FELLOW", list: "/fel/schools", tabs: ["Sessions", "Students"] },
  { role: "SUPERVISOR", list: "/sc/schools", tabs: ["Sessions", "Fellows", "Students", "Groups"] },
  {
    role: "HUB_COORDINATOR",
    list: "/hc/schools",
    tabs: ["Sessions", "Supervisors", "Fellows", "Students", "Groups"],
  },
];

for (const flow of flows) {
  test(`${flow.role} opens a school from the list and walks its tabs`, async ({
    page,
    context,
  }) => {
    test.setTimeout(3 * 60 * 1000);
    await signInAs(context, flow.role);

    await page.goto(getUrl(flow.list));
    const firstRow = dataRows(page).first();
    await expect(firstRow, `${flow.list} lists no schools`).toBeVisible();
    const schoolName = (await firstRow.getByRole("cell").first().innerText()).trim();
    expect(schoolName).not.toBe("");

    // The row menu is the last cell; "View school" is its first item.
    await firstRow.getByRole("cell").last().click();
    await page.getByRole("menuitem", { name: "View school" }).click();
    await expect(page).toHaveURL(new RegExp(`${flow.list}/[^/]+/`));

    for (const tab of flow.tabs) {
      await page.getByRole("radio", { name: `Select ${tab}`, exact: true }).click();
      // The development server compiles each route on its first request, which is how CI runs
      // this, so the first visit to a tab can take longer than the default expect timeout.
      await expect(page).toHaveURL(new RegExp(`/${tab.toLowerCase()}$`), { timeout: 30_000 });
      await expect(page.getByText(errorBoundary)).toHaveCount(0);
      await expect(page.getByRole("main")).toContainText(schoolName);
    }
  });
}
