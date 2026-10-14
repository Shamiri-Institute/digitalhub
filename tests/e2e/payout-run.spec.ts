import { expect, test } from "@playwright/test";
import { format } from "date-fns";
import { eq, gte, sql } from "drizzle-orm";

import { db } from "#/db/client";
import { fellowAttendance, hub, payoutStatements } from "#/db/schema";
import { signableMember, signInWithEmail } from "#/tests/helpers";
import { getUrl } from "#/tests/pages/helpers";

/**
 * An ops user runs and confirms a payout. A run executes every eligible statement of the ops user's
 * implementer in their project, so playwright.config.ts runs this spec in its own project after
 * every other spec. The database checks cover what no page shows: which statements and attendances
 * a run processed, and who confirmed them.
 */

test.describe.configure({ mode: "serial" });

type Fixture = { attendanceId: number; sessionAmount: number };
type OtherImplementerFixture = Fixture & { hubId: string; originalProjectId: string | null };
let ops: { email: string; userId: string; implementerId: string; projectId: string };
let fixture: Fixture;
let otherImplementer: OtherImplementerFixture;
let insertedPayoutId: string;
let otherImplementerPayoutId: string;
let runExecutedAt: Date;
const startedAt = new Date();

test.beforeAll(async () => {
  const {
    rows: [firstOps],
  } = await db.execute<typeof ops>(sql`
    select u.email, u.id as "userId", o.implementer_id as "implementerId",
      coalesce(u.active_project_id, (select id from projects where is_default)) as "projectId"
    from ops_users o
    join implementer_members m on m.identifier = o.id and m.role = 'OPERATIONS'
    join users u on u.id = m.user_id and u.email is not null
    where ${signableMember()}
    order by o.id
    limit 1`);
  if (!firstOps) throw new Error("seed the database first: no ops user");
  ops = firstOps;

  // An attendance a payout run picks up: attended, unprocessed, at an occurred session, for an
  // active fellow. The seed executes every statement it writes, so give it an unexecuted one.
  const eligibleAttendance = sql`
    select fa.id as "attendanceId", sn.amount as "sessionAmount",
      h.id as "hubId", h.project_id as "originalProjectId"
    from fellow_attendances fa
    join intervention_sessions i on i.id = fa.session_id and i.occurred
    join session_names sn on sn.id = i.session_id and sn.amount > 0
    join fellows f on f.id = fa.fellow_id and coalesce(f.dropped_out, false) = false
    join hubs h on h.id = f.hub_id
    where fa.attended and fa.processed_at is null
      and not exists (select 1 from payout_statements ps where ps.fellow_attendance_id = fa.id)`;
  const {
    rows: [row],
  } = await db.execute<Fixture>(sql`${eligibleAttendance}
    and h.implementer_id = ${ops.implementerId} and h.project_id = ${ops.projectId}
    order by fa.id limit 1`);
  if (!row) throw new Error("seed the database first: no attended, unprocessed attendance");
  fixture = row;

  // Another implementer's hub, moved into the ops user's project until afterAll.
  const {
    rows: [otherRow],
  } = await db.execute<OtherImplementerFixture>(sql`${eligibleAttendance}
    and h.implementer_id <> ${ops.implementerId}
    order by fa.id limit 1`);
  if (!otherRow) throw new Error("seed the database first: no attendance of another implementer");
  otherImplementer = otherRow;
  await db.update(hub).set({ projectId: ops.projectId }).where(eq(hub.id, otherImplementer.hubId));

  insertedPayoutId = await insertUnexecutedStatement(fixture);
  otherImplementerPayoutId = await insertUnexecutedStatement(otherImplementer);
});

async function insertUnexecutedStatement(attendance: Fixture) {
  const [inserted] = await db
    .insert(payoutStatements)
    .values({
      fellowAttendanceId: attendance.attendanceId,
      amount: attendance.sessionAmount,
      reason: "MARK_SESSION_ATTENDANCE",
      createdBy: ops.userId,
    })
    .returning({ id: payoutStatements.id });
  if (!inserted) throw new Error("could not insert the payout statement fixture");
  return inserted.id;
}

test.afterAll(async () => {
  // A run touches every eligible row, so undo by time. This spec runs alone, so nothing else
  // sets these columns meanwhile.
  await db
    .update(payoutStatements)
    .set({ confirmedAt: null, confirmedBy: null })
    .where(gte(payoutStatements.confirmedAt, startedAt));
  await db
    .update(payoutStatements)
    .set({ executedAt: null })
    .where(gte(payoutStatements.executedAt, startedAt));
  await db
    .update(fellowAttendance)
    .set({ processedAt: null })
    .where(gte(fellowAttendance.processedAt, startedAt));
  for (const payoutId of [insertedPayoutId, otherImplementerPayoutId]) {
    if (payoutId) await db.delete(payoutStatements).where(eq(payoutStatements.id, payoutId));
  }
  if (otherImplementer) {
    await db
      .update(hub)
      .set({ projectId: otherImplementer.originalProjectId })
      .where(eq(hub.id, otherImplementer.hubId));
  }
});

test("an ops user triggers a payout run", async ({ page, context }) => {
  await signInWithEmail(context, ops.email);
  await page.goto(getUrl("/ops/reporting/expenses/payout-history"));

  await page.getByRole("button", { name: "Manually Trigger Payout" }).click();
  const dialog = page.getByRole("dialog", { name: "Confirm Payout Trigger" });
  await dialog.getByRole("button", { name: "Confirm Trigger" }).click();
  await expect(dialog).toBeHidden();

  const [executedPayout] = await db
    .select({ executedAt: payoutStatements.executedAt })
    .from(payoutStatements)
    .where(eq(payoutStatements.id, insertedPayoutId));
  const [processedAttendance] = await db
    .select({ processedAt: fellowAttendance.processedAt })
    .from(fellowAttendance)
    .where(eq(fellowAttendance.id, fixture.attendanceId));
  const executedAt = executedPayout?.executedAt;
  if (!executedAt) throw new Error("the payout run did not execute the fixture's statement");
  expect(processedAttendance?.processedAt).toEqual(executedAt);
  runExecutedAt = executedAt;

  // Must not write: another implementer's statement in the same project stays unexecuted.
  const [otherPayout] = await db
    .select({ executedAt: payoutStatements.executedAt })
    .from(payoutStatements)
    .where(eq(payoutStatements.id, otherImplementerPayoutId));
  expect(otherPayout?.executedAt).toBeNull();

  // The run is listed with the sum of the statements it executed.
  const {
    rows: [run],
  } = await db.execute<{ expectedPayoutAmount: number }>(sql`
    select sum(amount)::int as "expectedPayoutAmount" from payout_statements
    where executed_at = ${executedAt.toISOString()}`);
  await page.reload();
  const runRow = page
    .getByRole("row")
    .filter({ hasText: format(executedAt, "dd-MM-yyyy HH:mm:ss") });
  await expect(runRow).toContainText(String(run?.expectedPayoutAmount));
});

test("an ops user confirms the payout run", async ({ page, context }) => {
  await signInWithEmail(context, ops.email);
  await page.goto(getUrl("/ops/reporting/expenses/payout-history"));

  // Runs are listed newest first, so the run stays on the first page. The table search does not
  // match the formatted date, so find the row by its text instead.
  const dateAdded = format(runExecutedAt, "dd-MM-yyyy HH:mm:ss");
  const runRow = page.getByRole("row").filter({ hasText: dateAdded });
  await runRow.getByRole("button", { name: "Confirm Payout", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Confirm Payout" });
  await dialog.getByRole("button", { name: "Confirm Payout" }).click();
  await expect(dialog).toBeHidden();

  await page.reload();
  await expect(runRow.getByRole("button", { name: "Confirmed" })).toBeDisabled();

  // Every statement of this run, and only this run, is confirmed by this user.
  const confirmedPayouts = await db
    .select({ executedAt: payoutStatements.executedAt, confirmedBy: payoutStatements.confirmedBy })
    .from(payoutStatements)
    .where(gte(payoutStatements.confirmedAt, startedAt));
  expect(confirmedPayouts.length).toBeGreaterThan(0);
  for (const confirmedPayout of confirmedPayouts) {
    expect(confirmedPayout).toEqual({ executedAt: runExecutedAt, confirmedBy: ops.userId });
  }
});
