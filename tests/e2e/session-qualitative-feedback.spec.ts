import { expect, type Page, test } from "@playwright/test";
import { and, eq, sql } from "drizzle-orm";

import { db } from "#/db/client";
import { interventionSessionRating, sessionComment } from "#/db/schema";
import { signableMember, signInAs, signInWithEmail, required } from "#/tests/helpers";
import { expandRow, getUrl } from "#/tests/pages/helpers";

test.describe.configure({ mode: "serial" });

const ratingId = "isr_e2e_eng2231";
const notes = `Feedback ${Date.now()}`;

let supervisorEmail: string;
let interventionSessionId: string;
let schoolName: string;

test.beforeAll(async () => {
  const {
    rows: [fixture],
  } = await db.execute<{
    email: string;
    supervisorId: string;
    interventionSessionId: string;
    schoolName: string;
  }>(sql`
    select u.email, m.identifier as "supervisorId", i.id as "interventionSessionId",
      s.school_name as "schoolName"
    from users u
    join implementer_members m on m.user_id = u.id and m.role = 'SUPERVISOR'
    join schools s on s.assigned_supervisor_id = m.identifier and s.archived_at is null
    join intervention_sessions i on i.school_id = s.id
    where ${signableMember()}
    order by u.email, i.session_date < now() desc, i.session_date, i.id
    limit 1`);
  required(fixture, "no supervisor with an assigned school");

  supervisorEmail = fixture.email;
  interventionSessionId = fixture.interventionSessionId;
  schoolName = fixture.schoolName;
  await db
    .insert(interventionSessionRating)
    .values({
      id: ratingId,
      sessionId: interventionSessionId,
      supervisorId: fixture.supervisorId,
      studentBehaviorRating: 4,
      adminSupportRating: 3,
      workloadRating: 2,
    })
    // The seed rates sessions that have occurred; keep its rating if this session has one.
    .onConflictDoNothing();
});

test.afterAll(async () => {
  if (!interventionSessionId) return;
  await db
    .delete(sessionComment)
    .where(
      and(eq(sessionComment.sessionId, interventionSessionId), eq(sessionComment.content, notes)),
    );
  await db.delete(interventionSessionRating).where(eq(interventionSessionRating.id, ratingId));
});

async function openFeedbackDialog(page: Page, menuItem: string, rowSchoolName = schoolName) {
  const sessions = await expandRow(page, page.getByRole("row").filter({ hasText: rowSchoolName }));
  await sessions.locator("tbody tr").first().locator("td").last().click();
  await page.getByText(menuItem).click();
  return page.getByRole("dialog").filter({ hasText: rowSchoolName });
}

test("a supervisor saves session feedback and sees it after a reload", async ({
  context,
  page,
}) => {
  await signInWithEmail(context, supervisorEmail);
  await page.goto(getUrl("/sc/reporting/school-reports/session"));

  const editDialog = await openFeedbackDialog(page, "Edit school report");
  await editDialog.getByLabel("Add your notes").fill(notes);
  await editDialog.getByRole("button", { name: "Add notes" }).click();
  await expect(page.getByText("Successfully submitted qualitative feedback").first()).toBeVisible();

  await page.reload();
  const viewDialog = await openFeedbackDialog(page, "View qualitative feedback");
  await expect(viewDialog.getByText(notes)).toBeVisible();
});

test("a hub coordinator reads session feedback but cannot add notes", async ({ context, page }) => {
  const coordinator = await signInAs(context, "HUB_COORDINATOR");
  const {
    rows: [ratedSchool],
  } = await db.execute<{ schoolName: string }>(sql`
    select s.school_name as "schoolName"
    from hub_coordinators h
    join schools s on s.hub_id = h.assigned_hub_id
    join intervention_sessions i on i.school_id = s.id and i.occurred
    join intervention_session_ratings r on r.session_id = i.id
    where h.id = ${coordinator.identifier}
    order by s.school_name
    limit 1`);
  required(ratedSchool, "no rated session in the hub");

  await page.goto(getUrl("/hc/reporting/school-reports/session"));
  const dialog = await openFeedbackDialog(page, "Edit school report", ratedSchool.schoolName);
  await expect(dialog.getByText("Workload (1 unacceptable to 5 outstanding)")).toBeVisible();
  await expect(dialog.getByLabel("Add your notes")).toHaveCount(0);
  await expect(dialog.getByRole("button", { name: "Add notes" })).toHaveCount(0);
});
