import type { Page } from "@playwright/test";
import { format } from "date-fns";
import { eq, sql } from "drizzle-orm";

import { db } from "#/db/client";
import { interventionSession, interventionSessionRating } from "#/db/schema";
import { objectId } from "#/lib/crypto";
import { expect, test, type Undo } from "#/tests/fixtures";
import { required, signableMember, signInWithEmail } from "#/tests/helpers";
import { chooseRowAction, getUrl } from "#/tests/pages/helpers";

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

type Fixture = {
  email: string;
  supervisorId: string;
  hubId: string;
  schoolId: string;
  visibleId: string;
  sessionNameId: string;
};

// A supervisor's school with no session within a day of the spec's own, so that session is the
// only one of its date on the school's sessions page.
async function createRatedSession(heldDaysAgo: number, ratedAt: Date, undo: Undo) {
  const sessionDate = new Date(Date.now() - heldDaysAgo * DAY_MS);
  const {
    rows: [fixture],
  } = await db.execute<Fixture>(sql`
    select u.email, s.assigned_supervisor_id as "supervisorId", s.hub_id as "hubId",
      s.id as "schoolId", s.visible_id as "visibleId", n.id as "sessionNameId"
    from schools s
    join implementer_members m on m.identifier = s.assigned_supervisor_id and m.role = 'SUPERVISOR'
    join users u on u.id = m.user_id
    join session_names n on n.hub_id = s.hub_id and n.session_type = 'INTERVENTION'
    where s.archived_at is null and ${signableMember()}
      and not exists (select 1 from intervention_sessions i
        where i.school_id = s.id
          and i.session_date between ${new Date(sessionDate.getTime() - DAY_MS)}
            and ${new Date(sessionDate.getTime() + DAY_MS)})
    order by u.email desc, s.visible_id desc, n.session_name desc
    limit 1`);
  required(fixture, "a supervisor's school missing an intervention session");
  const sessionId = objectId("isess");
  await db.insert(interventionSession).values({
    id: sessionId,
    sessionId: fixture.sessionNameId,
    sessionDate,
    yearOfImplementation: sessionDate.getFullYear(),
    schoolId: fixture.schoolId,
    hubId: fixture.hubId,
    occurred: true,
  });
  const ratingId = objectId("isr");
  await db.insert(interventionSessionRating).values({
    id: ratingId,
    sessionId,
    supervisorId: fixture.supervisorId,
    studentBehaviorRating: 3,
    adminSupportRating: 3,
    workloadRating: 3,
    headcount: 10,
    createdAt: ratedAt,
  });
  undo(async () => {
    await db.delete(interventionSessionRating).where(eq(interventionSessionRating.id, ratingId));
    await db.delete(interventionSession).where(eq(interventionSession.id, sessionId));
  });
  return { ...fixture, ratingId, sessionDate };
}

async function openSessionReport(page: Page, visibleId: string, sessionDate: Date) {
  await page.goto(getUrl(`/sc/schools/${visibleId}/sessions`));
  const sessionRow = page.getByRole("row").filter({
    has: page.locator("td:first-child", { hasText: format(sessionDate, "dd MMM yyyy") }),
  });
  await chooseRowAction(page, sessionRow, "Weekly session report");
  const dialog = page.getByRole("dialog", { name: "Weekly session report" });
  await expect(dialog).toBeVisible();
  return dialog;
}

test("a session report edited inside its 14 days is saved", async ({ page, context, undo }) => {
  const rated = await createRatedSession(3, new Date(Date.now() - 13 * DAY_MS), undo);
  await signInWithEmail(context, rated.email);

  const dialog = await openSessionReport(page, rated.visibleId, rated.sessionDate);
  await dialog.getByRole("spinbutton").fill("25");
  await dialog.getByRole("button", { name: "Update & save" }).click();
  await expect(dialog).toBeHidden();

  await page.reload();
  const reopened = await openSessionReport(page, rated.visibleId, rated.sessionDate);
  await expect(reopened.getByRole("spinbutton")).toHaveValue("25");
});

test("saving a session report past its 14 days is refused", async ({ page, context, undo }) => {
  const rated = await createRatedSession(4, new Date(Date.now() - 14 * DAY_MS + HOUR_MS), undo);
  await signInWithEmail(context, rated.email);

  const dialog = await openSessionReport(page, rated.visibleId, rated.sessionDate);
  await dialog.getByRole("spinbutton").fill("25");
  // Ageing the row behind the open dialog leaves the browser believing it may still edit, so only
  // the server can refuse this save.
  await db
    .update(interventionSessionRating)
    .set({ createdAt: new Date(Date.now() - 15 * DAY_MS) })
    .where(eq(interventionSessionRating.id, rated.ratingId));
  await dialog.getByRole("button", { name: "Update & save" }).click();
  await expect(page.getByText(/can no longer be edited/).first()).toBeVisible();

  await page.reload();
  const reopened = await openSessionReport(page, rated.visibleId, rated.sessionDate);
  await expect(reopened.getByRole("spinbutton")).toHaveValue("10");
  await expect(reopened.getByRole("button", { name: "Update & save" })).toBeDisabled();
});
