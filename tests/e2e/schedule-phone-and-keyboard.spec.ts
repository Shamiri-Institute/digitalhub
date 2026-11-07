import { devices, expect, type Page, test } from "@playwright/test";
import { formatInTimeZone } from "date-fns-tz";
import { and, asc, eq, isNotNull } from "drizzle-orm";

import { db } from "#/db/client";
import { hubCoordinator, interventionSession, school } from "#/db/schema";
import { required, signInAs } from "#/tests/helpers";
import { getUrl } from "#/tests/pages/helpers";

/** A day with a session in the coordinator's hub, so the month view has a chip to reach. */
async function sessionDayFor(coordinatorId: string | null) {
  required(coordinatorId, "a hub coordinator profile");
  const [firstSession] = await db
    .select({ sessionDate: interventionSession.sessionDate })
    .from(interventionSession)
    .innerJoin(school, eq(school.id, interventionSession.schoolId))
    .innerJoin(hubCoordinator, eq(hubCoordinator.assignedHubId, school.hubId))
    .where(and(eq(hubCoordinator.id, coordinatorId), isNotNull(interventionSession.sessionDate)))
    .orderBy(asc(interventionSession.sessionDate))
    .limit(1);
  required(firstSession?.sessionDate, "a session in the coordinator's hub");
  return formatInTimeZone(firstSession.sessionDate, "Africa/Nairobi", "yyyy-MM-dd");
}

async function tabTo(page: Page, isTarget: () => Promise<boolean>) {
  for (let press = 0; press < 80; press++) {
    await page.keyboard.press("Tab");
    if (await isTarget()) return true;
  }
  return false;
}

test("a keyboard user opens a session's menu from the month view", async ({ page, context }) => {
  const coordinator = await signInAs(context, "HUB_COORDINATOR");
  const day = await sessionDayFor(coordinator.identifier);
  await page.goto(getUrl(`/hc/schedule?mode=month&date=${day}`));

  const grid = page.getByRole("grid");
  const firstChip = grid.locator("button[aria-haspopup=menu]").first();
  await expect(firstChip).toBeVisible();

  const reachedChip = await tabTo(page, () =>
    firstChip.evaluate((chip) => chip === document.activeElement),
  );
  expect(reachedChip, "Tab reaches a session chip").toBe(true);

  await page.keyboard.press("Enter");
  await expect(page.getByRole("menu")).toBeVisible();

  // Arrow keys move inside the menu; they must not move the calendar's date.
  await page.keyboard.press("ArrowDown");
  await expect
    .poll(() => page.evaluate(() => document.activeElement?.getAttribute("role")))
    .toBe("menuitem");
  expect(new URL(page.url()).searchParams.get("date")).toBe(day);

  await page.keyboard.press("Escape");
  await expect(page.getByRole("menu")).toHaveCount(0);
  await expect(firstChip).toBeFocused();
});

test("Tab leaves the month view after its last session", async ({ page, context }) => {
  const coordinator = await signInAs(context, "HUB_COORDINATOR");
  const day = await sessionDayFor(coordinator.identifier);
  await page.goto(getUrl(`/hc/schedule?mode=month&date=${day}`));

  const grid = page.getByRole("grid");
  const lastChip = grid.locator("button[aria-haspopup=menu]").last();
  await expect(lastChip).toBeVisible();
  const reachedLastChip = await tabTo(page, () =>
    lastChip.evaluate((chip) => chip === document.activeElement),
  );
  expect(reachedLastChip, "Tab reaches the last session chip").toBe(true);

  await page.keyboard.press("Tab");
  const focusInGrid = await grid.evaluate((element) => element.contains(document.activeElement));
  expect(focusInGrid, "focus leaves the grid instead of returning to the focused date").toBe(false);
});

test("a click on a chip opens its menu, and a click beside it selects the day", async ({
  page,
  context,
}) => {
  const coordinator = await signInAs(context, "HUB_COORDINATOR");
  const day = await sessionDayFor(coordinator.identifier);
  await page.goto(getUrl(`/hc/schedule?mode=month&date=${day}`));

  const grid = page.getByRole("grid");
  await grid.locator("button[aria-haspopup=menu]").first().click();
  await expect(page.getByRole("menu")).toBeVisible();
  await page.keyboard.press("Escape");

  // The day buttons sit under the chips. A day with no sessions has nothing on top of its button,
  // and the top-right corner of any day is empty.
  const emptyDay = grid
    .locator("td:not([aria-disabled=true])")
    .filter({ hasNot: page.locator("[aria-haspopup]") })
    .nth(3);
  const emptyDayBox = await emptyDay.boundingBox();
  required(emptyDayBox, "a day without sessions on screen");
  await page.mouse.click(emptyDayBox.x + emptyDayBox.width - 6, emptyDayBox.y + 6);
  await expect.poll(() => new URL(page.url()).searchParams.get("date")).not.toBe(day);
});

test.describe("on a phone", () => {
  const { viewport, userAgent, isMobile, hasTouch, deviceScaleFactor } = devices["Pixel 7"];
  test.use({ viewport, userAgent, isMobile, hasTouch, deviceScaleFactor });

  test("the schedule opens in the list view and fits the screen", async ({ page, context }) => {
    await signInAs(context, "HUB_COORDINATOR");
    await page.goto(getUrl("/hc/schedule"));

    await expect(page.getByRole("radio", { name: "Select list view" })).toBeChecked();
    const pageScrollsSideways = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    expect(pageScrollsSideways).toBe(false);
  });

  test("a view named in the URL still wins", async ({ page, context }) => {
    await signInAs(context, "HUB_COORDINATOR");
    await page.goto(getUrl("/hc/schedule?mode=month"));

    await expect(page.getByRole("radio", { name: "Select month view" })).toBeChecked();
  });
});
