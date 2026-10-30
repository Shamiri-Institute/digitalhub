import { expect, type Page, test } from "@playwright/test";
import { addDays, format, startOfWeek } from "date-fns";

import { signInAs } from "#/tests/helpers";
import { getUrl, scheduleUrl } from "#/tests/pages/helpers";

const errorBoundary = "Oops! Something went wrong!";

/** The page's requests for server-rendered data (the `rsc` header), leaving out link prefetches. */
function serverRenderRequests(page: Page) {
  const urls: string[] = [];
  page.on("request", (request) => {
    const headers = request.headers();
    if (headers.rsc === "1" && !headers["next-router-prefetch"]) urls.push(request.url());
  });
  return urls;
}

test.describe("supervisor schedule mode from the URL", () => {
  test.beforeEach(async ({ context }) => {
    await signInAs(context, "SUPERVISOR");
  });

  test("falls back to the month view when the URL asks for the table view", async ({ page }) => {
    await page.goto(getUrl("/sc/schedule?mode=table"));

    await expect(page.getByRole("radio", { name: "Select month view" })).toBeChecked();
    await expect(page.getByLabel("Select table view")).toHaveCount(0);
    await expect(page.getByText(errorBoundary)).toHaveCount(0);
  });

  test("falls back to the month view when the URL names an unknown mode", async ({ page }) => {
    await page.goto(getUrl("/sc/schedule?mode=bogus"));

    await expect(page.getByRole("radio", { name: "Select month view" })).toBeChecked();
    await expect(page.getByText(errorBoundary)).toHaveCount(0);
  });

  test("back and forward show the view that the URL names", async ({ page }) => {
    await page.goto(getUrl("/sc/schedule"));
    await page.getByLabel("Select week view").click();
    await expect(page).toHaveURL(/mode=week/);
    await page.getByLabel("Select list view").click();
    await expect(page).toHaveURL(/mode=list/);

    await page.goBack();
    await expect(page).toHaveURL(/mode=week/);
    await expect(page.getByRole("radio", { name: "Select week view" })).toBeChecked();

    await page.goForward();
    await expect(page).toHaveURL(/mode=list/);
    await expect(page.getByRole("radio", { name: "Select list view" })).toBeChecked();
  });

  test("the visible dates are in the URL, so a reload keeps them", async ({ page }) => {
    await page.goto(getUrl("/sc/schedule?mode=week"));
    const title = page.getByRole("heading", { level: 3 });
    const thisWeek = await title.innerText();

    await page.getByRole("button", { name: "Next", exact: true }).click();
    await expect(title).not.toHaveText(thisWeek);
    await expect(page).toHaveURL(/date=\d{4}-\d{2}-\d{2}/);
    const nextWeek = await title.innerText();

    await page.reload();
    await expect(title).toHaveText(nextWeek);
  });
});

test.describe("hub coordinator schedule mode from the URL", () => {
  test.beforeEach(async ({ context }) => {
    await signInAs(context, "HUB_COORDINATOR");
  });

  test("renders the table view when the URL asks for it", async ({ page }) => {
    await page.goto(getUrl("/hc/schedule?mode=table"));

    await expect(page.getByRole("radio", { name: "Select table view" })).toBeChecked();
    await expect(page.getByLabel("Select Supervisors")).toBeVisible();
    await expect(page.getByText(errorBoundary)).toHaveCount(0);
  });

  test("the table view's day is in the URL, so a reload keeps it", async ({ context, page }) => {
    const today = new Date();
    const sunday = startOfWeek(today);
    const otherDay = today.getDay() === 0 ? addDays(sunday, 1) : sunday;
    await page.goto(await scheduleUrl(context, "/hc/schedule?mode=table", today));
    await expect(
      page.getByRole("radio", { name: `Select ${format(today, "EEEE")}` }),
    ).toBeChecked();

    const dayToggle = page.getByRole("radio", { name: `Select ${format(otherDay, "EEEE")}` });
    const requests = serverRenderRequests(page);
    // A click before hydration does nothing, so click until the URL changes.
    await expect(async () => {
      await dayToggle.click();
      await expect(page).toHaveURL(new RegExp(`date=${format(otherDay, "yyyy-MM-dd")}`), {
        timeout: 2000,
      });
    }).toPass();
    await expect(dayToggle).toBeChecked();
    expect(requests).toEqual([]);

    await page.reload();
    await expect(dayToggle).toBeChecked();
  });

  test("the table view's supervisors or fellows choice is in the URL, so reload and back/forward keep it", async ({
    context,
    page,
  }) => {
    await page.goto(await scheduleUrl(context, "/hc/schedule?mode=week", new Date()));
    // A click before hydration does nothing, so click until the URL changes.
    await expect(async () => {
      await page.getByLabel("Select table view").click();
      await expect(page).toHaveURL(/mode=table/, { timeout: 2000 });
    }).toPass();
    await expect(page.getByRole("radio", { name: "Select Supervisors" })).toBeChecked();

    const fellows = page.getByRole("radio", { name: "Select Fellows" });
    const requests = serverRenderRequests(page);
    await fellows.click();
    await expect(page).toHaveURL(/role=fellows/);
    await expect(fellows).toBeChecked();
    await expect(page.getByRole("columnheader", { name: "Group", exact: true })).toBeVisible();
    expect(requests).toEqual([]);

    await page.goBack();
    await expect(page).toHaveURL(/mode=week/);
    await page.goForward();
    await expect(page).toHaveURL(/role=fellows/);
    await expect(fellows).toBeChecked();

    await page.reload();
    await expect(fellows).toBeChecked();
  });
});
