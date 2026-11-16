import type { Locator, Page } from "@playwright/test";
import { inArray, sql } from "drizzle-orm";

import { db } from "#/db/client";
import { interventionSession, sessionName } from "#/db/schema";
import { TIME_ZONE_COOKIE } from "#/lib/schedule-view";
import { expect, test, type Undo } from "#/tests/fixtures";
import { required, signableMember, signInWithEmail } from "#/tests/helpers";
import { getUrl } from "#/tests/pages/helpers";

const timeZone = "Africa/Nairobi";
test.use({ timezoneId: timeZone });

type Coordinator = { email: string; hubId: string; schoolName: string };

// A hub coordinator whose hub has an intervention session type, so the dialog has one to leave out.
async function pickCoordinator() {
  const {
    rows: [row],
  } = await db.execute<Coordinator>(sql`
    select u.email, h.id as "hubId", min(s.school_name) as "schoolName"
    from hub_coordinators hc
    join implementer_members m on m.identifier = hc.id and m.role = 'HUB_COORDINATOR'
    join users u on u.id = m.user_id
    join hubs h on h.id = hc.assigned_hub_id
    join schools s on s.hub_id = h.id and s.archived_at is null
    where ${signableMember()}
      and exists (select 1 from session_names n
        where n.hub_id = h.id and n.session_type = 'INTERVENTION')
    group by u.email, h.id
    order by u.email
    limit 1`);
  required(row, "a hub coordinator whose hub has schools and intervention session types");
  return row;
}

/** A clinical and a supervision session type of the hub, new so no session of either exists. */
async function createSessionTypes(hubId: string, undo: Undo) {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const created = await db
    .insert(sessionName)
    .values([
      {
        hubId,
        sessionType: "CLINICAL" as const,
        sessionName: `e2e-cl-${suffix}`,
        sessionLabel: `E2E clinical ${suffix}`,
        amount: 0,
      },
      {
        hubId,
        sessionType: "SUPERVISION" as const,
        sessionName: `e2e-sv-${suffix}`,
        sessionLabel: `E2E supervision ${suffix}`,
        amount: 0,
      },
    ])
    .returning({ id: sessionName.id, sessionLabel: sessionName.sessionLabel });
  const ids = created.map(({ id }) => id);
  undo(async () => {
    await db.delete(interventionSession).where(inArray(interventionSession.sessionId, ids));
    await db.delete(sessionName).where(inArray(sessionName.id, ids));
  });
  const [clinical, supervision] = created;
  required(clinical, "the clinical session type");
  required(supervision, "the supervision session type");
  return { clinicalLabel: clinical.sessionLabel, supervisionLabel: supervision.sessionLabel };
}

async function openScheduleDialog(page: Page) {
  await page
    .context()
    .addCookies([{ name: TIME_ZONE_COOKIE, value: timeZone, domain: "localhost", path: "/" }]);
  await page.goto(getUrl("/hc/schedule"), { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Schedule a session" }).click();
  return page.getByRole("dialog", { name: "Schedule a session" });
}

async function chooseOption(page: Page, combobox: Locator, name: string | RegExp) {
  await combobox.click();
  await page.getByRole("option", { name }).click();
}

test("scheduling a session offers no intervention session types", async ({ page, context }) => {
  const coordinator = await pickCoordinator();
  await signInWithEmail(context, coordinator.email);

  const dialog = await openScheduleDialog(page);
  await dialog.getByRole("combobox").first().click();
  await expect(page.getByRole("option").first()).toBeVisible();
  await expect(page.getByRole("option", { name: /^Intervention session/ })).toHaveCount(0);
});

test("a school session type needs a school, and a hub session type is saved without one", async ({
  page,
  context,
  undo,
}) => {
  const coordinator = await pickCoordinator();
  const { clinicalLabel, supervisionLabel } = await createSessionTypes(coordinator.hubId, undo);
  const venue = `E2E venue ${Date.now()}`;
  await signInWithEmail(context, coordinator.email);

  const dialog = await openScheduleDialog(page);
  const sessionTypeSelect = dialog.getByRole("combobox").first();
  await chooseOption(page, sessionTypeSelect, new RegExp(clinicalLabel));
  await dialog.getByRole("button", { name: "Pick a date" }).click();
  await page.getByRole("gridcell").getByRole("button").filter({ hasText: /^15$/ }).first().click();
  await page.keyboard.press("Escape");
  await dialog.getByRole("button", { name: "Pick a time" }).click();
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await dialog.getByRole("button", { name: "Submit" }).click();
  await expect(dialog.getByText("Please select a school.")).toBeVisible();

  // A school chosen for a school session stays behind if the type then changes to a hub one.
  await chooseOption(page, dialog.getByRole("combobox").nth(1), coordinator.schoolName);
  await chooseOption(page, sessionTypeSelect, new RegExp(supervisionLabel));
  await dialog.getByRole("textbox").fill(venue);
  await dialog.getByRole("button", { name: "Submit" }).click();
  await expect(page.getByText("Successfully created new session").first()).toBeVisible();

  const scheduledDay = new Date();
  scheduledDay.setDate(15);
  const localDate = new Intl.DateTimeFormat("en-CA", { timeZone }).format(scheduledDay);
  await page.goto(getUrl(`/hc/schedule?mode=list&span=day&date=${localDate}`));
  // The list names a session's place: its school, or for a hub session with no school its venue.
  await expect(page.getByRole("button", { name: new RegExp(` at ${venue}$`) })).toBeVisible();
});
