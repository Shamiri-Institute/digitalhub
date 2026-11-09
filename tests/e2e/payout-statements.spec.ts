import type { Page } from "@playwright/test";
import { and, asc, eq, gte, inArray, sql } from "drizzle-orm";

import { db } from "#/db/client";
import { fellowAttendance, payoutStatements, sessionName } from "#/db/schema";
import { expect, test } from "#/tests/fixtures";
import {
  onlySessionAtSchoolThatWeek,
  required,
  signableMember,
  signInWithEmail,
  uniqueFellowName,
} from "#/tests/helpers";
import {
  cellUnder,
  chooseRowAction,
  getUrl,
  rowWithCell,
  scheduleUrl,
  searchRows,
} from "#/tests/pages/helpers";

/**
 * Marking a fellow's attendance writes their payout statements. The totals come from the
 * supervisor's fellow expenses report; the database is read only for the ledger's entries, which
 * the report pages ten at a time and does not count.
 */

test.describe.configure({ mode: "serial" });

async function openSessionWeek(page: Page, sessionDate: Date, schoolName: string) {
  await page.goto(await scheduleUrl(page.context(), "/sc/schedule?mode=list", sessionDate));
  return page.getByRole("row").filter({ hasText: schoolName });
}

/** The fellow's total payouts on the supervisor's expenses report: every statement, summed. */
async function fellowTotal(page: Page, fellowName: string) {
  await page.goto(getUrl("/sc/reporting/expenses/fellows"));
  const row = await rowWithCell(page, page.getByRole("main"), fellowName);
  await expect(row).toHaveCount(1);
  return Number(await (await cellUnder(page, row, "Total Amount (KES)")).innerText());
}

async function openFellowAttendance(page: Page, sessionDate: Date, schoolName: string) {
  const sessionRow = (await openSessionWeek(page, sessionDate, schoolName)).first();
  await chooseRowAction(page, sessionRow, "Mark fellow attendance");
  return page.getByRole("dialog", { name: "Mark fellow attendance" });
}

/** Marks one fellow attended or missed from the session's fellow attendance dialog. */
async function markFellow(
  page: Page,
  session: { sessionDate: Date; schoolName: string },
  fellowName: string,
  mark: "Attended" | "Missed",
) {
  const dialog = await openFellowAttendance(page, session.sessionDate, session.schoolName);
  const fellowRow = await searchRows(page, fellowName, dialog);
  await chooseRowAction(page, fellowRow, "Mark attendance");
  const markDialog = page.getByRole("dialog").filter({ hasText: "Select attendance" });
  await markDialog.getByRole("radio", { name: mark }).click();
  if (mark === "Missed") {
    await markDialog.getByRole("combobox", { name: "Select reason for above" }).click();
    await page.getByRole("option").first().click();
  }
  await markDialog.getByRole("button", { name: "Submit" }).click();
  await expect(markDialog).toBeHidden();
}

function statementsOf(attendanceId: number) {
  return db
    .select({
      amount: payoutStatements.amount,
      reason: payoutStatements.reason,
      mpesaNumber: payoutStatements.mpesaNumber,
    })
    .from(payoutStatements)
    .where(eq(payoutStatements.fellowAttendanceId, attendanceId))
    .orderBy(asc(payoutStatements.createdAt));
}

test.describe("unmarking a paid attendance", () => {
  type Fixture = {
    attendanceId: number;
    sessionDate: Date;
    sessionAmount: number;
    sessionNameId: string;
    schoolName: string;
    fellowName: string;
    email: string;
  };
  let fixture: Fixture;
  let original: typeof fellowAttendance.$inferSelect;
  const startedAt = new Date();

  // The fellow leads a group the UI lets them mark: a treatment group for an intervention session.
  // It already has a payout statement, so marking it missed writes a reversal.
  async function pickAttendedUnprocessedSessionOfSignableSupervisor() {
    const {
      rows: [row],
    } = await db.execute<Omit<Fixture, "sessionDate"> & { sessionDate: string }>(sql`
      select fa.id as "attendanceId", s.session_date as "sessionDate",
        sn.amount as "sessionAmount", sn.id as "sessionNameId", sc.school_name as "schoolName",
        f.fellow_name as "fellowName", u.email
      from fellow_attendances fa
      join intervention_sessions s on s.id = fa.session_id and s.occurred
      join session_names sn on sn.id = s.session_id and sn.amount > 0
      join schools sc on sc.id = s.school_id
      join fellows f on f.id = fa.fellow_id and f.hub_id = sc.hub_id
        and coalesce(f.dropped_out, false) = false and ${uniqueFellowName()}
      join intervention_groups g on g.school_id = sc.id and g.leader_id = f.id
        and (sn."session_type" <> 'INTERVENTION' or g.group_type = 'TREATMENT')
      join implementer_members m on m.identifier = f.supervisor_id and m.role = 'SUPERVISOR'
      join users u on u.id = m.user_id
      where fa.attended and fa.processed_at is null and ${signableMember()}
        and ${onlySessionAtSchoolThatWeek("s")}
        and (select ps.reason from payout_statements ps where ps.fellow_attendance_id = fa.id
          order by ps.created_at desc limit 1) <> 'UNMARK_SESSION_ATTENDANCE'
      order by s.session_date desc, fa.id
      limit 1`);
    required(row, "no attended, paid, unprocessed attendance");
    return row;
  }

  test.beforeAll(async () => {
    const row = await pickAttendedUnprocessedSessionOfSignableSupervisor();
    fixture = { ...row, sessionDate: new Date(row.sessionDate) };
    const [attendance] = await db
      .select()
      .from(fellowAttendance)
      .where(eq(fellowAttendance.id, fixture.attendanceId));
    if (!attendance) throw new Error(`attendance ${fixture.attendanceId} is gone`);
    original = attendance;
  });

  test.afterAll(async () => {
    await db
      .update(sessionName)
      .set({ amount: fixture.sessionAmount })
      .where(eq(sessionName.id, fixture.sessionNameId));
    const { id, ...columns } = original;
    await db.update(fellowAttendance).set(columns).where(eq(fellowAttendance.id, id));
    await db
      .delete(payoutStatements)
      .where(
        and(
          eq(payoutStatements.fellowAttendanceId, original.id),
          gte(payoutStatements.createdAt, startedAt),
        ),
      );
  });

  test("PAY-04, PAY-05, R-ad-session-amount-change: marking a paid fellow missed adds a reversal of what was paid, even after the rate changed", async ({
    page,
    context,
  }) => {
    const ledgerBefore = await statementsOf(fixture.attendanceId);
    const paidBefore = ledgerBefore.reduce((sum, entry) => sum + entry.amount, 0);
    // The hub's rate for the session changed after the attendance was paid.
    await db
      .update(sessionName)
      .set({ amount: fixture.sessionAmount + 300 })
      .where(eq(sessionName.id, fixture.sessionNameId));

    await signInWithEmail(context, fixture.email);
    const totalBefore = await fellowTotal(page, fixture.fellowName);
    await markFellow(page, fixture, fixture.fellowName, "Missed");

    await page.reload();
    const reopened = await openFellowAttendance(page, fixture.sessionDate, fixture.schoolName);
    await expect(await searchRows(page, fixture.fellowName, reopened)).toContainText("Missed");
    expect(await fellowTotal(page, fixture.fellowName)).toBe(totalBefore - paidBefore);

    // The ledger is append-only: the earlier entries stay as they were, and the correction is a
    // new entry.
    const ledgerAfter = await statementsOf(fixture.attendanceId);
    expect(ledgerAfter.slice(0, -1)).toEqual(ledgerBefore);
    expect(ledgerAfter.at(-1)).toMatchObject({
      amount: -paidBefore,
      reason: "UNMARK_SESSION_ATTENDANCE",
    });
  });
});

test.describe("marking unmarked fellows", () => {
  type Fixture = {
    sessionId: string;
    sessionDate: Date;
    sessionAmount: number;
    sessionNameId: string;
    schoolName: string;
    email: string;
    fellowIds: string[];
    fellowNames: string[];
    fellowMpesaNumbers: (string | null)[];
  };
  let fixture: Fixture;

  async function pickLoneSessionWithTwoUnmarkedFellows() {
    const {
      rows: [row],
    } = await db.execute<Omit<Fixture, "sessionDate"> & { sessionDate: string }>(sql`
      select i.id as "sessionId", i.session_date as "sessionDate", sn.amount as "sessionAmount",
        sn.id as "sessionNameId", s.school_name as "schoolName", u.email,
        (array_agg(f.id order by f.id))[1:2] as "fellowIds",
        (array_agg(f.fellow_name order by f.id))[1:2] as "fellowNames",
        (array_agg(f.mpesa_number order by f.id))[1:2] as "fellowMpesaNumbers"
      from intervention_sessions i
      join session_names sn on sn.id = i.session_id and sn."session_type" = 'INTERVENTION'
        and sn.amount > 0
      join schools s on s.id = i.school_id
      join intervention_groups g on g.school_id = s.id and g.group_type = 'TREATMENT'
      join fellows f on f.id = g.leader_id and coalesce(f.dropped_out, false) = false
        and f.fellow_name is not null and ${uniqueFellowName()}
      join supervisors sv on sv.id = f.supervisor_id and sv.hub_id = f.hub_id
        and sv.hub_id = s.hub_id
      join implementer_members m on m.identifier = sv.id and m.role = 'SUPERVISOR'
      join users u on u.id = m.user_id
      where i.occurred and ${signableMember()}
        and not exists (
          select 1 from fellow_attendances fa where fa.session_id = i.id and fa.fellow_id = f.id)
        and ${onlySessionAtSchoolThatWeek()}
      group by i.id, i.session_date, sn.amount, sn.id, s.school_name, u.email
      having count(distinct f.id) >= 2
      order by i.session_date desc, i.id, u.email
      limit 1`);
    required(row, "no session with two unmarked fellows");
    return row;
  }

  test.beforeAll(async () => {
    const row = await pickLoneSessionWithTwoUnmarkedFellows();
    fixture = { ...row, sessionDate: new Date(row.sessionDate) };
  });

  test.afterEach(async () => {
    await db
      .update(sessionName)
      .set({ amount: fixture.sessionAmount })
      .where(eq(sessionName.id, fixture.sessionNameId));
    const createdAttendances = await db
      .select({ id: fellowAttendance.id })
      .from(fellowAttendance)
      .where(
        and(
          eq(fellowAttendance.sessionId, fixture.sessionId),
          inArray(fellowAttendance.fellowId, fixture.fellowIds),
        ),
      );
    const createdIds = createdAttendances.map(({ id }) => id);
    if (createdIds.length > 0) {
      await db
        .delete(payoutStatements)
        .where(inArray(payoutStatements.fellowAttendanceId, createdIds));
      await db.delete(fellowAttendance).where(inArray(fellowAttendance.id, createdIds));
    }
  });

  async function attendanceIdOf(fellowId: string) {
    const attendance = await db.query.fellowAttendance.findFirst({
      where: (a, { and, eq }) => and(eq(a.sessionId, fixture.sessionId), eq(a.fellowId, fellowId)),
      columns: { id: true },
    });
    required(attendance, "the fellow's attendance");
    return attendance.id;
  }

  test("PAY-02, PAY-03, PAY-04, R-ad-session-amount-change: a fellow is paid the hub's current rate once, only when marked attended", async ({
    page,
    context,
  }) => {
    const [fellowId] = fixture.fellowIds;
    const [fellowName] = fixture.fellowNames;
    required(fellowId, "a fellow");
    required(fellowName, "a fellow's name");
    // The hub's rate changed before this attendance was marked, so the mark pays the new rate.
    const changedRate = fixture.sessionAmount + 250;
    await db
      .update(sessionName)
      .set({ amount: changedRate })
      .where(eq(sessionName.id, fixture.sessionNameId));

    await signInWithEmail(context, fixture.email);
    const totalBefore = await fellowTotal(page, fellowName);

    await markFellow(page, fixture, fellowName, "Missed");
    expect(await fellowTotal(page, fellowName)).toBe(totalBefore);
    const attendanceId = await attendanceIdOf(fellowId);
    expect(await statementsOf(attendanceId)).toEqual([]);

    await markFellow(page, fixture, fellowName, "Attended");
    expect(await fellowTotal(page, fellowName)).toBe(totalBefore + changedRate);

    await markFellow(page, fixture, fellowName, "Attended");
    expect(await fellowTotal(page, fellowName)).toBe(totalBefore + changedRate);
    // One entry for the one change, carrying the fellow's M-Pesa number when it was marked.
    expect(await statementsOf(attendanceId)).toEqual([
      {
        amount: changedRate,
        reason: "MARK_SESSION_ATTENDANCE",
        mpesaNumber: fixture.fellowMpesaNumbers[0] ?? null,
      },
    ]);
  });

  test("R-pay-from-attendance: a supervisor marks two fellows attended at once, and each is paid once", async ({
    page,
    context,
  }) => {
    await signInWithEmail(context, fixture.email);
    const totalsBefore = [];
    for (const fellowName of fixture.fellowNames) {
      totalsBefore.push(await fellowTotal(page, fellowName));
    }
    const dialog = await openFellowAttendance(page, fixture.sessionDate, fixture.schoolName);
    for (const fellowName of fixture.fellowNames) {
      const fellowRow = await searchRows(page, fellowName, dialog);
      await fellowRow.getByRole("checkbox", { name: "Select row" }).check();
    }
    await dialog.getByRole("button", { name: "Mark fellow attendance" }).click();
    const mark = page.getByRole("dialog").filter({ hasText: "Select attendance" });
    await expect(mark).toContainText("2 fellows");
    await mark.getByRole("radio", { name: "Attended" }).click();
    await mark.getByRole("button", { name: "Submit" }).click();
    await expect(mark).toBeHidden();

    await page.reload();
    const reopened = await openFellowAttendance(page, fixture.sessionDate, fixture.schoolName);
    for (const fellowName of fixture.fellowNames) {
      await expect(await searchRows(page, fellowName, reopened)).toContainText("Attended");
    }
    for (const [index, fellowName] of fixture.fellowNames.entries()) {
      expect(await fellowTotal(page, fellowName)).toBe(
        (totalsBefore[index] ?? Number.NaN) + fixture.sessionAmount,
      );
    }
  });

  // Both submits are sent together, but nothing makes them overlap on the server, so this proves
  // a second mark of the same fellow pays nothing, not the race itself.
  test("PAY-04: marking the same fellow from two open tabs pays once", async ({
    page,
    context,
  }) => {
    await signInWithEmail(context, fixture.email);
    const fellowName = fixture.fellowNames[0];
    if (!fellowName) throw new Error("fixture has no fellow");
    const totalBefore = await fellowTotal(page, fellowName);

    const secondTab = await context.newPage();
    const submitButtons = await Promise.all(
      [page, secondTab].map(async (tab) => {
        const dialog = await openFellowAttendance(tab, fixture.sessionDate, fixture.schoolName);
        const fellowRow = await searchRows(tab, fellowName, dialog);
        await chooseRowAction(tab, fellowRow, "Mark attendance");
        const mark = tab.getByRole("dialog").filter({ hasText: "Select attendance" });
        await mark.getByRole("radio", { name: "Attended" }).click();
        return mark.getByRole("button", { name: "Submit" });
      }),
    );
    const actionResponses = [page, secondTab].map((tab) =>
      tab.waitForResponse((response) => response.request().headers()["next-action"] !== undefined),
    );
    await Promise.all(submitButtons.map((submit) => submit.click()));
    await Promise.all(actionResponses);

    await page.reload();
    const reopened = await openFellowAttendance(page, fixture.sessionDate, fixture.schoolName);
    await expect(await searchRows(page, fellowName, reopened)).toContainText("Attended");
    expect(await fellowTotal(page, fellowName)).toBe(totalBefore + fixture.sessionAmount);
  });
});
