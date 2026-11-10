import type { Page } from "@playwright/test";
import { eq, inArray, sql } from "drizzle-orm";

import { db } from "#/db/client";
import { interventionGroup, interventionSession, school } from "#/db/schema";
import { objectId } from "#/lib/crypto";
import { TIME_ZONE_COOKIE } from "#/lib/schedule-view";
import { expect, test, type Undo } from "#/tests/fixtures";
import { required, signableMember, signInWithEmail } from "#/tests/helpers";
import { getUrl } from "#/tests/pages/helpers";

type Coordinator = {
  email: string;
  hubId: string;
  projectId: string;
  sessionNameId: string;
  sessionName: string;
};

async function pickCoordinator() {
  const {
    rows: [row],
  } = await db.execute<Coordinator>(sql`
    select u.email, h.id as "hubId", h.project_id as "projectId",
      n.id as "sessionNameId", n.session_name as "sessionName"
    from hub_coordinators hc
    join implementer_members m on m.identifier = hc.id and m.role = 'HUB_COORDINATOR'
    join users u on u.id = m.user_id
    join hubs h on h.id = hc.assigned_hub_id
    join lateral (select n.id, n.session_name from session_names n
      where n.hub_id = h.id and n.session_type = 'INTERVENTION'
      order by n.session_name limit 1) n on true
    where ${signableMember()}
      and exists (select 1 from fellows f where f.hub_id = h.id
        and coalesce(f.dropped_out, false) = false)
    order by u.email
    limit 1`);
  required(row, "a hub coordinator whose hub has intervention session types and fellows");
  return row;
}

const DAY_MS = 24 * 3600 * 1000;

/** A session at 22:00 UTC three days ago: 01:00 the next day in Nairobi. */
async function createLateEveningSession(undo: Undo) {
  const coordinator = await pickCoordinator();
  const schoolId = objectId("sch");
  const schoolName = `E2E time zone school ${objectId("sch")}`;
  const sessionId = objectId("isess");
  undo(async () => {
    await db.delete(interventionSession).where(eq(interventionSession.id, sessionId));
    await db.delete(school).where(eq(school.id, schoolId));
  });
  await db
    .insert(school)
    .values({ id: schoolId, visibleId: objectId("sch"), schoolName, hubId: coordinator.hubId });
  const sessionDate = new Date(Date.now() - 3 * DAY_MS);
  sessionDate.setUTCHours(22, 0, 0, 0);
  await db.insert(interventionSession).values({
    id: sessionId,
    hubId: coordinator.hubId,
    projectId: coordinator.projectId,
    schoolId,
    sessionId: coordinator.sessionNameId,
    sessionType: coordinator.sessionName,
    occurred: false,
    yearOfImplementation: sessionDate.getFullYear(),
    sessionDate,
  });
  const utcDay = sessionDate.toISOString().slice(0, 10);
  const nairobiDay = new Date(sessionDate.getTime() + DAY_MS).toISOString().slice(0, 10);
  return { email: coordinator.email, schoolName, utcDay, nairobiDay };
}

async function openDayList(page: Page, timeZone: string, day: string) {
  await page
    .context()
    .addCookies([{ name: TIME_ZONE_COOKIE, value: timeZone, domain: "localhost", path: "/" }]);
  await page.goto(getUrl(`/hc/schedule?mode=list&span=day&date=${day}`), {
    waitUntil: "networkidle",
  });
  await expect(page.getByRole("heading", { level: 2 })).toBeVisible();
}

test.describe("a viewer in Nairobi", () => {
  test.use({ timezoneId: "Africa/Nairobi" });

  test("sees a late-evening UTC session on the next day", async ({ page, context, undo }) => {
    const fixture = await createLateEveningSession(undo);
    await signInWithEmail(context, fixture.email);
    const sessionRow = page.getByRole("row").filter({ hasText: fixture.schoolName });

    await openDayList(page, "Africa/Nairobi", fixture.nairobiDay);
    await expect(sessionRow).toContainText("1:00 - ");
    await openDayList(page, "Africa/Nairobi", fixture.utcDay);
    await expect(sessionRow).toHaveCount(0);
  });
});

test.describe("a viewer in UTC", () => {
  test.use({ timezoneId: "UTC" });

  test("sees a late-evening UTC session on its own day", async ({ page, context, undo }) => {
    const fixture = await createLateEveningSession(undo);
    await signInWithEmail(context, fixture.email);
    const sessionRow = page.getByRole("row").filter({ hasText: fixture.schoolName });

    await openDayList(page, "UTC", fixture.utcDay);
    await expect(sessionRow).toContainText("10:00 - ");
    await openDayList(page, "UTC", fixture.nairobiDay);
    await expect(sessionRow).toHaveCount(0);
  });

  test("a school added from UTC has its sessions at 4 PM Nairobi time", async ({
    page,
    context,
    undo,
  }) => {
    test.slow();
    const coordinator = await pickCoordinator();
    const schoolName = `E2E Nairobi school ${Date.now()}${Math.floor(Math.random() * 1000)}`;
    undo(async () => {
      const created = db
        .select({ id: school.id })
        .from(school)
        .where(eq(school.schoolName, schoolName));
      await db.delete(interventionSession).where(inArray(interventionSession.schoolId, created));
      await db.delete(interventionGroup).where(inArray(interventionGroup.schoolId, created));
      await db.delete(school).where(eq(school.schoolName, schoolName));
    });
    await signInWithEmail(context, coordinator.email);

    await page.goto(getUrl("/hc/schools"));
    await page.getByRole("button", { name: "Add school" }).click();
    const dialog = page.getByRole("dialog", { name: "Add new school" });
    await dialog.getByRole("textbox", { name: /^School name/ }).fill(schoolName);
    await dialog.getByRole("spinbutton", { name: /^Expected no. of students/ }).fill("16");
    await dialog.getByRole("button", { name: /^Pre-session date/ }).click();
    // The seed schedules sessions from a month before it runs, so a day a year earlier is free
    // for every fellow.
    const preSessionYear = new Date().getUTCFullYear() - 1;
    const picker = page.getByRole("dialog").last();
    await picker
      .getByRole("combobox", { name: "Choose the Year" })
      .selectOption(String(preSessionYear));
    await picker
      .getByRole("gridcell")
      .getByRole("button")
      .filter({ hasText: /^15$/ })
      .first()
      .click();
    await dialog.getByRole("button", { name: "Add School", exact: true }).click();
    await expect(dialog).toBeHidden();

    // Adding a school schedules its intervention sessions, the first on the pre-session date.
    const preSessionDay = `${preSessionYear}-${String(new Date().getUTCMonth() + 1).padStart(2, "0")}-15`;
    await openDayList(page, "UTC", preSessionDay);
    await expect(page.getByRole("row").filter({ hasText: schoolName })).toContainText("1:00 - ");
  });
});
