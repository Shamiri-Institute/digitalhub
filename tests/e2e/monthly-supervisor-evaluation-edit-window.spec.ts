import { format, startOfMonth } from "date-fns";
import { eq, sql } from "drizzle-orm";

import { db } from "#/db/client";
import { monthlySupervisorEvaluation, supervisor } from "#/db/schema";
import { objectId } from "#/lib/crypto";
import { expect, test } from "#/tests/fixtures";
import { required, signableMember, signInWithEmail } from "#/tests/helpers";
import { chooseRowAction, getUrl, searchRows } from "#/tests/pages/helpers";

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

test("saving a monthly supervisor evaluation past its 14 days is refused", async ({
  page,
  context,
  undo,
}) => {
  const {
    rows: [coordinator],
  } = await db.execute<{
    email: string;
    coordinatorId: string;
    hubId: string;
    implementerId: string;
    projectId: string;
    projectStart: string;
  }>(sql`
    select u.email, hc.id as "coordinatorId", h.id as "hubId", h.implementer_id as "implementerId",
      p.id as "projectId", p.actual_start_date as "projectStart"
    from hub_coordinators hc
    join implementer_members m on m.identifier = hc.id and m.role = 'HUB_COORDINATOR'
    join users u on u.id = m.user_id
    join hubs h on h.id = hc.assigned_hub_id
    join projects p on p.id = h.project_id and p.actual_start_date is not null
    where ${signableMember()}
    order by u.email
    limit 1`);
  required(coordinator, "a hub coordinator whose project has started");
  const supervisorId = objectId("sup");
  const supervisorName = `E2E evaluated supervisor ${Date.now()}`;
  await db.insert(supervisor).values({
    id: supervisorId,
    supervisorName,
    hubId: coordinator.hubId,
    implementerId: coordinator.implementerId,
  });
  // The dialog's first month is the project's first.
  const month = startOfMonth(new Date(coordinator.projectStart));
  const savedComment = `saved comment ${Date.now()}`;
  const [evaluation] = await db
    .insert(monthlySupervisorEvaluation)
    .values({
      supervisorId,
      hubCoordinatorId: coordinator.coordinatorId,
      projectId: coordinator.projectId,
      month: new Date(`${format(month, "yyyy-MM-dd")}T00:00:00Z`),
      createdAt: new Date(Date.now() - 14 * DAY_MS + HOUR_MS),
      respectfulness: 3,
      attitude: 3,
      collaboration: 3,
      reliability: 3,
      identificationOfIssues: 3,
      leadership: 3,
      communicationStyle: 3,
      conflictResolution: 3,
      adaptability: 3,
      recognitionAndFeedback: 3,
      decisionMaking: 3,
      fellowRecruitmentEffectiveness: 3,
      fellowTrainingEffectiveness: 3,
      programLogisticsCoordination: 3,
      programSessionAttendance: 3,
      workplaceDemeanorComments: savedComment,
      managementStyleComments: savedComment,
      programExecutionComments: savedComment,
    })
    .returning({ id: monthlySupervisorEvaluation.id });
  required(evaluation, "the inserted evaluation");
  undo(async () => {
    await db
      .delete(monthlySupervisorEvaluation)
      .where(eq(monthlySupervisorEvaluation.supervisorId, supervisorId));
    await db.delete(supervisor).where(eq(supervisor.id, supervisorId));
  });
  await signInWithEmail(context, coordinator.email);

  const dialog = page.getByRole("dialog", { name: "Monthly supervisor evaluation" });
  async function openMonth() {
    await page.goto(getUrl("/hc/supervisors"));
    await chooseRowAction(
      page,
      await searchRows(page, supervisorName),
      "Monthly supervisor evaluation",
    );
    await dialog.getByRole("combobox").first().click();
    await page.getByRole("option", { name: `Month 1 - ${format(month, "MMM yyyy")}` }).click();
    await expect(dialog.getByRole("textbox").first()).toHaveValue(savedComment);
  }

  await openMonth();
  await dialog.getByRole("textbox").first().fill(`changed comment ${Date.now()}`);
  // Ageing the row behind the open dialog leaves the browser believing it may still edit, so only
  // the server can refuse this save.
  await db
    .update(monthlySupervisorEvaluation)
    .set({ createdAt: new Date(Date.now() - 15 * DAY_MS) })
    .where(eq(monthlySupervisorEvaluation.id, evaluation.id));
  await dialog.getByRole("button", { name: "Update & save" }).click();
  await expect(page.getByText(/can no longer be edited/).first()).toBeVisible();

  await openMonth();
  await expect(dialog.getByRole("button", { name: "Update & save" })).toBeDisabled();
});
