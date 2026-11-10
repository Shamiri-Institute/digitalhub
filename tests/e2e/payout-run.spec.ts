import type { Page } from "@playwright/test";
import { format } from "date-fns";
import { eq, gte, sql } from "drizzle-orm";

import { db, pool } from "#/db/client";
import { fellowAttendance, hub, payoutStatements } from "#/db/schema";
import { expect, test } from "#/tests/fixtures";
import { raceOnRow, required, signableMember, signInWithEmail } from "#/tests/helpers";
import { getUrl, searchRows } from "#/tests/pages/helpers";

/**
 * A run executes every eligible statement of the admin's implementer in their project, so
 * playwright.config.ts runs this spec in its own project after every other spec. The database
 * checks cover what no page shows: which statements and attendances a run processed, and who
 * confirmed them.
 */

test.describe.configure({ mode: "serial" });

type Fixture = { attendanceId: number; sessionAmount: number };
type OtherImplementerFixture = Fixture & {
  hubId: string;
  originalProjectId: string;
  fellowName: string;
};
let operationsAdmin: { email: string; userId: string; implementerId: string; projectId: string };
let fixture: Fixture;
let otherImplementer: OtherImplementerFixture;
let insertedPayoutId: string;
let otherImplementerPayoutId: string;
let runExecutedAt: Date;
const startedAt = new Date();

test.beforeAll(async () => {
  const {
    rows: [firstOperationsAdmin],
  } = await db.execute<typeof operationsAdmin>(sql`
    select u.email, u.id as "userId", a.implementer_id as "implementerId",
      coalesce(u.active_project_id, (select id from projects where is_default)) as "projectId"
    from admin_users a
    join implementer_members m on m.identifier = a.id and m.role = 'ADMIN'
    join users u on u.id = m.user_id
    where a.team = 'OPERATIONS' and not a.is_super_admin and ${signableMember()}
    order by u.email
    limit 1`);
  required(firstOperationsAdmin, "no Operations admin");
  operationsAdmin = firstOperationsAdmin;

  const eligibleAttendance = sql`
    select fa.id as "attendanceId", sn.amount as "sessionAmount",
      h.id as "hubId", h.project_id as "originalProjectId", f.fellow_name as "fellowName"
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
    and h.implementer_id = ${operationsAdmin.implementerId} and h.project_id = ${operationsAdmin.projectId}
    order by fa.id limit 1`);
  required(row, "no attended, unprocessed attendance");
  fixture = row;

  // Another implementer's hub, moved into the admin's project until afterAll.
  const {
    rows: [otherRow],
  } = await db.execute<OtherImplementerFixture>(sql`${eligibleAttendance}
    and h.implementer_id <> ${operationsAdmin.implementerId}
    and (select count(*) from fellows o where o.fellow_name = f.fellow_name) = 1
    order by fa.id limit 1`);
  required(otherRow, "no attendance of another implementer");
  otherImplementer = otherRow;
  await db
    .update(hub)
    .set({ projectId: operationsAdmin.projectId })
    .where(eq(hub.id, otherImplementer.hubId));

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
      createdBy: operationsAdmin.userId,
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

async function openTriggerDialog(tab: Page) {
  await tab.goto(getUrl("/admin/reporting/expenses/payout-history"));
  await tab.getByRole("button", { name: "Manually Trigger Payout" }).click();
  return tab.getByRole("dialog", { name: "Confirm Payout Trigger" });
}

test("R-pay-implementer: the fellow expenses report lists only the admin's implementer's fellows", async ({
  page,
}) => {
  await signInWithEmail(page.context(), operationsAdmin.email);
  await page.goto(getUrl("/admin/reporting/expenses/fellows"));
  // The other implementer's hub is in the admin's project, so only the implementer keeps it out.
  await expect(await searchRows(page, otherImplementer.fellowName)).toHaveCount(0);
});

test("R-pay-no-double-stamp, R-pay-implementer: two runs confirmed at once pay each statement once, and only the admin's implementer's", async ({
  page,
  context,
}) => {
  await signInWithEmail(context, operationsAdmin.email);

  // Two tabs confirm a run at once, as a double submission would. The second run must neither
  // execute the statements again nor re-stamp the attendances the first one processed.
  const dialogs = [await openTriggerDialog(page), await openTriggerDialog(await context.newPage())];
  await raceOnRow("fellow_attendances", fixture.attendanceId, async (waitForWaiting) => {
    for (const [index, dialog] of dialogs.entries()) {
      await dialog.getByRole("button", { name: "Confirm Trigger" }).click();
      await waitForWaiting(index + 1);
    }
  });
  for (const dialog of dialogs) {
    await expect(dialog).toBeHidden();
  }

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

test("R-pay-who: an Operations admin confirms the payout run", async ({ page, context }) => {
  await signInWithEmail(context, operationsAdmin.email);
  await page.goto(getUrl("/admin/reporting/expenses/payout-history"));

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

  const confirmedPayouts = await db
    .select({ executedAt: payoutStatements.executedAt, confirmedBy: payoutStatements.confirmedBy })
    .from(payoutStatements)
    .where(gte(payoutStatements.confirmedAt, startedAt));
  expect(confirmedPayouts.length).toBeGreaterThan(0);
  for (const confirmedPayout of confirmedPayouts) {
    expect(confirmedPayout).toEqual({
      executedAt: runExecutedAt,
      confirmedBy: operationsAdmin.userId,
    });
  }
});

test("R-pay-no-double-stamp: an attendance unmarked while a run is in flight is not paid", async ({
  page,
  undo,
}) => {
  // A new attended attendance with an unexecuted statement: the runs above processed the others.
  const {
    rows: [pair],
  } = await db.execute<{ fellowId: string; sessionId: string; sessionAmount: number }>(sql`
    select f.id as "fellowId", i.id as "sessionId", sn.amount as "sessionAmount"
    from fellows f
    join hubs h on h.id = f.hub_id
    join intervention_sessions i on i.hub_id = h.id and i.occurred
    join session_names sn on sn.id = i.session_id and sn.amount > 0
    where h.implementer_id = ${operationsAdmin.implementerId}
      and h.project_id = ${operationsAdmin.projectId}
      and coalesce(f.dropped_out, false) = false
      and not exists (select 1 from fellow_attendances fa
        where fa.fellow_id = f.id and fa.session_id = i.id)
    order by f.id, i.id
    limit 1`);
  required(pair, "a fellow and an occurred session of their hub with no attendance");
  const [attendance] = await db
    .insert(fellowAttendance)
    .values({ fellowId: pair.fellowId, sessionId: pair.sessionId, attended: true })
    .returning({ id: fellowAttendance.id });
  required(attendance, "the inserted attendance");
  undo(() => db.delete(fellowAttendance).where(eq(fellowAttendance.id, attendance.id)));
  const [statement] = await db
    .insert(payoutStatements)
    .values({
      fellowAttendanceId: attendance.id,
      amount: pair.sessionAmount,
      reason: "MARK_SESSION_ATTENDANCE",
      createdBy: operationsAdmin.userId,
    })
    .returning({ id: payoutStatements.id });
  required(statement, "the inserted statement");
  undo(() => db.delete(payoutStatements).where(eq(payoutStatements.id, statement.id)));

  await signInWithEmail(page.context(), operationsAdmin.email);
  const dialog = await openTriggerDialog(page);

  // The run reads the attendance as eligible, then waits on its row while a supervisor's unmark
  // commits. The unmark is written straight to the row the run is waiting for.
  const unmarker = await pool.connect();
  try {
    await unmarker.query("begin");
    const {
      rows: [unmarkerBackend],
    } = await unmarker.query<{ pid: number }>("select pg_backend_pid() as pid");
    await unmarker.query("select 1 from fellow_attendances where id = $1 for update", [
      attendance.id,
    ]);
    await dialog.getByRole("button", { name: "Confirm Trigger" }).click();
    await expect
      .poll(async () => {
        const { rows } = await pool.query<{ waiting: number }>(
          "select count(*)::int as waiting from pg_stat_activity where $1 = any(pg_blocking_pids(pid))",
          [unmarkerBackend?.pid],
        );
        return rows[0]?.waiting;
      })
      .toBe(1);
    await unmarker.query("update fellow_attendances set attended = false where id = $1", [
      attendance.id,
    ]);
    await unmarker.query("commit");
  } finally {
    unmarker.release();
  }
  await expect(dialog).toBeHidden();

  // Must not write: the unmarked attendance and its statement stay unprocessed.
  const [unmarked] = await db
    .select({ processedAt: fellowAttendance.processedAt })
    .from(fellowAttendance)
    .where(eq(fellowAttendance.id, attendance.id));
  const [unpaid] = await db
    .select({ executedAt: payoutStatements.executedAt })
    .from(payoutStatements)
    .where(eq(payoutStatements.id, statement.id));
  expect(unmarked?.processedAt).toBeNull();
  expect(unpaid?.executedAt).toBeNull();
});
