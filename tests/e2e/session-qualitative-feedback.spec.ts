import { expect, type Page, test } from "@playwright/test";
import { eq, sql } from "drizzle-orm";

import { db } from "#/db/client";
import { interventionSessionRating, sessionComment } from "#/db/schema";
import { signInWithEmail } from "#/tests/helpers";
import { getUrl } from "#/tests/pages/helpers";

/**
 * A supervisor adds qualitative feedback to a session from the school reports page, reloads and
 * sees it. The feedback used to be saved against the session label ("S1") instead of the
 * intervention session id, so the insert failed on the foreign key. The database is used only to
 * give the supervisor a rated session (the report lists rated sessions only) and to clean up.
 */

test.describe.configure({ mode: "serial", timeout: 3 * 60 * 1000 });

const supervisorEmail = "martin.odegaard@test.com";
const ratingId = "isr_e2e_eng2231";

let interventionSessionId: string;
let schoolName: string;

test.beforeAll(async () => {
  const {
    rows: [fixture],
  } = await db.execute<{
    supervisorId: string;
    interventionSessionId: string;
    schoolName: string;
  }>(sql`
    select m.identifier as "supervisorId", i.id as "interventionSessionId", s.school_name as "schoolName"
    from users u
    join implementer_members m on m.user_id = u.id and m.role = 'SUPERVISOR'
    join schools s on s.assigned_supervisor_id = m.identifier and s.archived_at is null
    join intervention_sessions i on i.school_id = s.id
    where u.email = ${supervisorEmail}
    order by i.session_date < now() desc, i.session_date, i.id
    limit 1`);
  if (!fixture) throw new Error(`No session at a school assigned to ${supervisorEmail}`);

  interventionSessionId = fixture.interventionSessionId;
  schoolName = fixture.schoolName;
  await db.insert(interventionSessionRating).values({
    id: ratingId,
    sessionId: interventionSessionId,
    supervisorId: fixture.supervisorId,
    studentBehaviorRating: 4,
    adminSupportRating: 3,
    workloadRating: 2,
  });
});

test.afterAll(async () => {
  if (!interventionSessionId) return;
  await db.delete(sessionComment).where(eq(sessionComment.sessionId, interventionSessionId));
  await db.delete(interventionSessionRating).where(eq(interventionSessionRating.id, ratingId));
});

async function openFeedbackDialog(page: Page, menuItem: string) {
  await page.getByRole("row").filter({ hasText: schoolName }).getByRole("button").first().click();
  // The expanded school row shows its sessions in a nested table; the last cell opens the menu.
  await page.locator("table table tbody tr").first().locator("td").last().click();
  await page.getByText(menuItem).click();
  return page.getByRole("dialog").filter({ hasText: schoolName });
}

test("a supervisor saves session feedback and sees it after a reload", async ({
  context,
  page,
}) => {
  await signInWithEmail(context, supervisorEmail);
  await page.goto(getUrl("/sc/reporting/school-reports/session"), { waitUntil: "networkidle" });

  const notes = `Feedback ${Date.now()}`;
  const editDialog = await openFeedbackDialog(page, "Edit school report");
  await editDialog.getByLabel("Add your notes").fill(notes);
  await editDialog.getByRole("button", { name: "Add notes" }).click();
  await expect(page.getByText("Successfully submitted qualitative feedback").first()).toBeVisible();

  await page.reload({ waitUntil: "networkidle" });
  const viewDialog = await openFeedbackDialog(page, "View qualitative feedback");
  await expect(viewDialog.getByText(notes)).toBeVisible();
});
