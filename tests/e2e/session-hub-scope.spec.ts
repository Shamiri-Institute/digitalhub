import type { BrowserContext, Locator, Page } from "@playwright/test";
import { eq, sql } from "drizzle-orm";

import { db } from "#/db/client";
import {
  hubCoordinator,
  implementerMember,
  interventionSession,
  school,
  session,
  user,
} from "#/db/schema";
import { objectId } from "#/lib/crypto";
import { TIME_ZONE_COOKIE } from "#/lib/schedule-view";
import { expect, test, type Undo } from "#/tests/fixtures";
import { required, signableMember, signInWithEmail } from "#/tests/helpers";
import { chooseRowAction, getUrl } from "#/tests/pages/helpers";

const timeZone = "Africa/Nairobi";
test.use({ timezoneId: timeZone });

type TwoHubs = {
  hubId: string;
  implementerId: string;
  projectId: string;
  sessionNameId: string;
  sessionName: string;
  coordinatorEmail: string;
  otherHubId: string;
  otherCoordinatorEmail: string;
};

// Two hubs of the default project, each with a hub coordinator who can sign in.
async function pickTwoHubs() {
  const {
    rows: [row],
  } = await db.execute<TwoHubs>(sql`
    with coordinators as (
      select h.id as hub_id, h.implementer_id, h.project_id, min(u.email) as email
      from hub_coordinators hc
      join implementer_members m on m.identifier = hc.id and m.role = 'HUB_COORDINATOR'
      join users u on u.id = m.user_id
      join hubs h on h.id = hc.assigned_hub_id
      join projects p on p.id = h.project_id and p.is_default
      where ${signableMember()}
      group by h.id
    )
    select a.hub_id as "hubId", a.implementer_id as "implementerId", a.project_id as "projectId",
      n.id as "sessionNameId", n.session_name as "sessionName", a.email as "coordinatorEmail",
      b.hub_id as "otherHubId", b.email as "otherCoordinatorEmail"
    from coordinators a
    join coordinators b on b.hub_id <> a.hub_id
    join lateral (select n.id, n.session_name from session_names n
      where n.hub_id = a.hub_id and n.session_type = 'INTERVENTION'
      order by n.session_name limit 1) n on true
    order by a.hub_id, b.hub_id
    limit 1`);
  required(row, "two default-project hubs with hub coordinators");
  return row;
}

/** A new school in the first hub with an unmarked session there yesterday at 09:00 in Nairobi. */
async function createSchoolSession(undo: Undo) {
  const hubs = await pickTwoHubs();
  const schoolId = objectId("sch");
  const schoolName = `E2E hub scope school ${objectId("sch")}`;
  const sessionId = objectId("isess");
  undo(async () => {
    await db.delete(interventionSession).where(eq(interventionSession.id, sessionId));
    await db.delete(school).where(eq(school.id, schoolId));
  });
  await db
    .insert(school)
    .values({ id: schoolId, visibleId: objectId("sch"), schoolName, hubId: hubs.hubId });
  const sessionDate = new Date(Date.now() - 24 * 3600 * 1000);
  sessionDate.setUTCHours(6, 0, 0, 0);
  await db.insert(interventionSession).values({
    id: sessionId,
    hubId: hubs.hubId,
    projectId: hubs.projectId,
    schoolId,
    sessionId: hubs.sessionNameId,
    sessionType: hubs.sessionName,
    occurred: false,
    yearOfImplementation: sessionDate.getFullYear(),
    sessionDate,
  });
  const localDate = new Intl.DateTimeFormat("en-CA", { timeZone }).format(sessionDate);
  return { ...hubs, schoolName, localDate };
}

/** A new hub coordinator of `hubId` who can sign in, and a way to move them to another hub. */
async function createHubCoordinator(hubs: { hubId: string; implementerId: string }, undo: Undo) {
  const coordinatorId = objectId("hc");
  const email = `e2e-hc-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  await db.insert(hubCoordinator).values({
    id: coordinatorId,
    visibleId: coordinatorId,
    coordinatorName: "E2E Hub Coordinator",
    implementerId: hubs.implementerId,
    assignedHubId: hubs.hubId,
  });
  const [created] = await db
    .insert(user)
    .values({ email, name: "E2E Hub Coordinator" })
    .returning({ id: user.id });
  required(created, "the new hub coordinator's user");
  await db.insert(implementerMember).values({
    implementerId: hubs.implementerId,
    userId: created.id,
    role: "HUB_COORDINATOR",
    identifier: coordinatorId,
  });
  undo(async () => {
    await db.delete(session).where(eq(session.userId, created.id));
    await db.delete(implementerMember).where(eq(implementerMember.userId, created.id));
    await db.delete(user).where(eq(user.id, created.id));
    await db.delete(hubCoordinator).where(eq(hubCoordinator.id, coordinatorId));
  });
  const moveTo = (hubId: string) =>
    db
      .update(hubCoordinator)
      .set({ assignedHubId: hubId })
      .where(eq(hubCoordinator.id, coordinatorId));
  return { email, moveTo };
}

async function openDayList(page: Page, localDate: string) {
  await page
    .context()
    .addCookies([{ name: TIME_ZONE_COOKIE, value: timeZone, domain: "localhost", path: "/" }]);
  await page.goto(getUrl(`/hc/schedule?mode=list&span=day&date=${localDate}`), {
    waitUntil: "networkidle",
  });
}

function sessionRowOf(page: Page, schoolName: string) {
  return page.getByRole("row").filter({ hasText: schoolName });
}

/** Clicks the button that runs a server action and waits for its answer. */
async function submitAction(page: Page, button: Locator) {
  const answered = page.waitForResponse((response) => response.request().method() === "POST");
  await button.click();
  await answered;
}

async function signedInPage(context: BrowserContext, email: string) {
  await signInWithEmail(context, email);
  return context.newPage();
}

test("another hub's coordinator does not see a hub's session", async ({ browser, undo }) => {
  const fixture = await createSchoolSession(undo);

  const ownHubPage = await signedInPage(await browser.newContext(), fixture.coordinatorEmail);
  await openDayList(ownHubPage, fixture.localDate);
  await expect(sessionRowOf(ownHubPage, fixture.schoolName)).toContainText("Not marked");

  const otherHubPage = await signedInPage(
    await browser.newContext(),
    fixture.otherCoordinatorEmail,
  );
  await openDayList(otherHubPage, fixture.localDate);
  await expect(otherHubPage.getByRole("heading", { level: 2 })).toBeVisible();
  await expect(sessionRowOf(otherHubPage, fixture.schoolName)).toHaveCount(0);
});

test("a coordinator moved to another hub cannot cancel, reschedule or mark the old hub's session", async ({
  context,
  undo,
}) => {
  const fixture = await createSchoolSession(undo);
  const coordinator = await createHubCoordinator(fixture, undo);
  await signInWithEmail(context, coordinator.email);

  const cancelTab = await context.newPage();
  await openDayList(cancelTab, fixture.localDate);
  await chooseRowAction(cancelTab, sessionRowOf(cancelTab, fixture.schoolName), "Cancel session");
  const confirmCancel = cancelTab
    .getByRole("dialog", { name: "Cancel session" })
    .getByRole("button", { name: "Confirm" });

  const rescheduleTab = await context.newPage();
  await openDayList(rescheduleTab, fixture.localDate);
  await chooseRowAction(
    rescheduleTab,
    sessionRowOf(rescheduleTab, fixture.schoolName),
    "Reschedule session",
  );
  const reschedule = rescheduleTab.getByRole("dialog", { name: "Reschedule session" });
  await reschedule.getByRole("button", { name: "9:00 AM" }).click();
  const timePicker = rescheduleTab.getByRole("dialog").filter({ hasText: "Pick a start time" });
  await timePicker.getByRole("spinbutton").first().fill("11");
  await timePicker.getByRole("button", { name: "Save", exact: true }).click();

  const markTab = await context.newPage();
  await openDayList(markTab, fixture.localDate);
  await chooseRowAction(
    markTab,
    sessionRowOf(markTab, fixture.schoolName),
    "Mark session occurrence",
  );
  await markTab.getByRole("radio", { name: "Attended" }).click();
  await markTab.getByRole("button", { name: "Submit" }).click();

  await coordinator.moveTo(fixture.otherHubId);
  await submitAction(cancelTab, confirmCancel);
  await submitAction(rescheduleTab, reschedule.getByRole("button", { name: "Save Changes" }));
  await submitAction(markTab, markTab.getByRole("button", { name: "Confirm" }));

  await coordinator.moveTo(fixture.hubId);
  await cancelTab.reload();
  const sessionRow = sessionRowOf(cancelTab, fixture.schoolName);
  await expect(sessionRow).toContainText("Not marked");
  await expect(sessionRow).toContainText("9:00");
  await expect(sessionRow).not.toContainText("Cancelled");
});
