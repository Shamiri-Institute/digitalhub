import { expect, type Page, test } from "@playwright/test";
import { and, eq, gte, inArray, sql } from "drizzle-orm";

import { db } from "#/db/client";
import { fellowAttendance, payoutStatements, sessionName } from "#/db/schema";
import { signableMember, signInWithEmail } from "#/tests/helpers";
import { chooseRowAction, scheduleUrl, searchRows } from "#/tests/pages/helpers";

/**
 * Fellow attendance, which writes payout statements, through the UI. Each test saves, reloads and
 * checks what the page shows; the database picks fixtures, restores them, and checks the payout
 * statements and absence reasons that no page shows. Payout runs are in payout-run.spec.ts.
 */

test.describe.configure({ mode: "serial" });

/** A user with one membership, so the session's active role is the one asked for. */
async function signableProfiles(table: string, role: string, hubColumn: string) {
  const { rows } = await db.execute<{ id: string; hubId: string; email: string; userId: string }>(
    sql`
    select p.id, p.${sql.raw(hubColumn)} as "hubId", u.email, u.id as "userId"
    from ${sql.raw(table)} p
    join implementer_members m on m.identifier = p.id and m.role = ${role}
    join users u on u.id = m.user_id and u.email is not null
    where p.${sql.raw(hubColumn)} is not null
      and ${signableMember()}
    order by p.id`,
  );
  return rows;
}

/** The schedule's list view for the week of `sessionDate`; rows at `schoolName`. */
async function openSessionWeek(page: Page, sessionDate: Date, schoolName: string) {
  await page.goto(await scheduleUrl(page.context(), "/sc/schedule?mode=list", sessionDate));
  return page.getByRole("row").filter({ hasText: schoolName });
}

async function openFellowAttendance(page: Page, sessionDate: Date, schoolName: string) {
  const sessionRow = (await openSessionWeek(page, sessionDate, schoolName)).first();
  await chooseRowAction(page, sessionRow, "Mark fellow attendance");
  return page.getByRole("dialog", { name: "Mark fellow attendance" });
}

test.describe("fellow attendance", () => {
  type Fixture = {
    attendanceId: number;
    sessionDate: Date;
    sessionAmount: number;
    sessionNameId: string;
    schoolName: string;
    fellowName: string;
    email: string;
    hubId: string;
  };
  let fixture: Fixture;
  // What the attendance has been paid so far, the net of its payout statements.
  let paidBefore: number;
  let original: typeof fellowAttendance.$inferSelect;
  const startedAt = new Date();

  test.beforeAll(async () => {
    // An attended, unprocessed session marked for a fellow of a supervisor who can sign in. The
    // fellow leads a group the UI lets them mark: a treatment group for an intervention session.
    // It already has a payout statement, so marking it missed writes a reversal.
    const {
      rows: [row],
    } = await db.execute<Omit<Fixture, "sessionDate"> & { sessionDate: string }>(sql`
      select fa.id as "attendanceId", s.session_date as "sessionDate",
        sn.amount as "sessionAmount", sn.id as "sessionNameId", sc.school_name as "schoolName",
        f.fellow_name as "fellowName", u.email, sc.hub_id as "hubId"
      from fellow_attendances fa
      join intervention_sessions s on s.id = fa.session_id and s.occurred
      join session_names sn on sn.id = s.session_id and sn.amount > 0
      join schools sc on sc.id = s.school_id
      join fellows f on f.id = fa.fellow_id and f.hub_id = sc.hub_id
        and coalesce(f.dropped_out, false) = false
      join intervention_groups g on g.school_id = sc.id and g.leader_id = f.id
        and (sn."session_type" <> 'INTERVENTION' or g.group_type = 'TREATMENT')
      join implementer_members m on m.identifier = f.supervisor_id and m.role = 'SUPERVISOR'
      join users u on u.id = m.user_id and u.email is not null
      where fa.attended and fa.processed_at is null and ${signableMember()}
        and (select ps.reason from payout_statements ps where ps.fellow_attendance_id = fa.id
          order by ps.created_at desc limit 1) <> 'UNMARK_SESSION_ATTENDANCE'
      order by s.session_date desc, fa.id
      limit 1`);
    if (!row) throw new Error("seed the database first: no attended, paid, unprocessed attendance");
    fixture = { ...row, sessionDate: new Date(row.sessionDate) };
    const [attendance] = await db
      .select()
      .from(fellowAttendance)
      .where(eq(fellowAttendance.id, fixture.attendanceId));
    if (!attendance) throw new Error(`attendance ${fixture.attendanceId} is gone`);
    original = attendance;
    const payouts = await db
      .select({ amount: payoutStatements.amount })
      .from(payoutStatements)
      .where(eq(payoutStatements.fellowAttendanceId, fixture.attendanceId));
    paidBefore = payouts.reduce((sum, payout) => sum + payout.amount, 0);
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

  test("a supervisor marks their fellow missed", async ({ page, context }) => {
    // A super admin raised the session's rate after the attendance was paid, as the edit hub
    // dialog allows. The reversal must cancel what was paid, not the new rate.
    await db
      .update(sessionName)
      .set({ amount: fixture.sessionAmount + 300 })
      .where(eq(sessionName.id, fixture.sessionNameId));

    await signInWithEmail(context, fixture.email);
    const dialog = await openFellowAttendance(page, fixture.sessionDate, fixture.schoolName);
    const fellowRow = await searchRows(page, fixture.fellowName, dialog);
    await expect(fellowRow).toContainText("Attended");

    await chooseRowAction(page, fellowRow, "Mark attendance");
    const mark = page.getByRole("dialog").filter({ hasText: "Select attendance" });
    await mark.getByRole("radio").nth(1).click();
    await mark.getByRole("combobox", { name: "Select reason for above" }).click();
    const absenceReason = (await page.getByRole("option").first().innerText()).trim();
    await page.getByRole("option").first().click();
    await mark.getByRole("button", { name: "Submit" }).click();
    await expect(mark).toBeHidden();

    await page.reload();
    const reopened = await openFellowAttendance(page, fixture.sessionDate, fixture.schoolName);
    await expect(await searchRows(page, fixture.fellowName, reopened)).toContainText("Missed");

    // No page shows the absence reason or the payout statements.
    const [markedFellowAttendance] = await db
      .select({ absenceReason: fellowAttendance.absenceReason })
      .from(fellowAttendance)
      .where(eq(fellowAttendance.id, fixture.attendanceId));
    expect(markedFellowAttendance).toEqual({ absenceReason });
    // The paid session is reversed with one statement that cancels what was paid, so the
    // attendance nets to zero even though the rate changed in between.
    const reversals = await db
      .select({ amount: payoutStatements.amount, reason: payoutStatements.reason })
      .from(payoutStatements)
      .where(
        and(
          eq(payoutStatements.fellowAttendanceId, fixture.attendanceId),
          gte(payoutStatements.createdAt, startedAt),
        ),
      );
    expect(reversals).toEqual([{ amount: -paidBefore, reason: "UNMARK_SESSION_ATTENDANCE" }]);
    const statements = await db
      .select({ amount: payoutStatements.amount })
      .from(payoutStatements)
      .where(eq(payoutStatements.fellowAttendanceId, fixture.attendanceId));
    expect(statements.reduce((sum, statement) => sum + statement.amount, 0)).toBe(0);
  });

  test("a supervisor in another hub does not see the session", async ({ page, context }) => {
    const supervisors = await signableProfiles("supervisors", "SUPERVISOR", "hub_id");
    const outsider = supervisors.find((s) => s.hubId !== fixture.hubId);
    if (!outsider) throw new Error("seed the database first: no supervisor in another hub");
    await signInWithEmail(context, outsider.email);

    const sessionRows = await openSessionWeek(page, fixture.sessionDate, fixture.schoolName);
    await expect(page.getByRole("button", { name: "Schedule a session" })).toBeVisible();
    await expect(sessionRows).toHaveCount(0);
  });
});

test.describe("bulk fellow attendance", () => {
  type Fixture = {
    sessionId: string;
    sessionDate: Date;
    sessionAmount: number;
    schoolName: string;
    email: string;
    fellowIds: string[];
    fellowNames: string[];
  };
  let fixture: Fixture;

  test.beforeAll(async () => {
    // An occurred intervention session, the only one at its school that week, where a supervisor
    // who can sign in has two fellows of their hub leading treatment groups and no attendance yet.
    const {
      rows: [row],
    } = await db.execute<Omit<Fixture, "sessionDate"> & { sessionDate: string }>(sql`
      select i.id as "sessionId", i.session_date as "sessionDate", sn.amount as "sessionAmount",
        s.school_name as "schoolName", u.email,
        (array_agg(f.id order by f.id))[1:2] as "fellowIds",
        (array_agg(f.fellow_name order by f.id))[1:2] as "fellowNames"
      from intervention_sessions i
      join session_names sn on sn.id = i.session_id and sn."session_type" = 'INTERVENTION'
        and sn.amount > 0
      join schools s on s.id = i.school_id
      join intervention_groups g on g.school_id = s.id and g.group_type = 'TREATMENT'
      join fellows f on f.id = g.leader_id and coalesce(f.dropped_out, false) = false
        and f.fellow_name is not null
      join supervisors sv on sv.id = f.supervisor_id and sv.hub_id = f.hub_id
        and sv.hub_id = s.hub_id
      join implementer_members m on m.identifier = sv.id and m.role = 'SUPERVISOR'
      join users u on u.id = m.user_id and u.email is not null
      where i.occurred and ${signableMember()}
        and not exists (
          select 1 from fellow_attendances fa where fa.session_id = i.id and fa.fellow_id = f.id)
        and not exists (
          select 1 from intervention_sessions o where o.school_id = i.school_id and o.id <> i.id
            and abs(extract(epoch from o.session_date - i.session_date)) < 7 * 24 * 3600)
      group by i.id, i.session_date, sn.amount, s.school_name, u.email
      having count(distinct f.id) >= 2
      order by i.session_date desc, i.id, u.email
      limit 1`);
    if (!row) throw new Error("seed the database first: no session with two unmarked fellows");
    fixture = { ...row, sessionDate: new Date(row.sessionDate) };
  });

  test.afterEach(async () => {
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

  test("a supervisor marks two fellows attended at once", async ({ page, context }) => {
    await signInWithEmail(context, fixture.email);
    const dialog = await openFellowAttendance(page, fixture.sessionDate, fixture.schoolName);
    for (const fellowName of fixture.fellowNames) {
      const fellowRow = await searchRows(page, fellowName, dialog);
      await fellowRow.getByRole("checkbox", { name: "Select row" }).check();
    }
    await dialog.getByRole("button", { name: "Mark fellow attendance" }).click();
    const mark = page.getByRole("dialog").filter({ hasText: "Select attendance" });
    await expect(mark).toContainText("2 fellows");
    await mark.getByRole("radio").first().click();
    await mark.getByRole("button", { name: "Submit" }).click();
    await expect(mark).toBeHidden();

    await page.reload();
    const reopened = await openFellowAttendance(page, fixture.sessionDate, fixture.schoolName);
    for (const fellowName of fixture.fellowNames) {
      await expect(await searchRows(page, fellowName, reopened)).toContainText("Attended");
    }

    // No page shows payout statements: one attendance per fellow, each with one statement of the
    // session's amount.
    const markedFellowAttendances = await db.query.fellowAttendance.findMany({
      where: (a, { and, eq, inArray }) =>
        and(eq(a.sessionId, fixture.sessionId), inArray(a.fellowId, fixture.fellowIds)),
      columns: { fellowId: true, attended: true },
      with: { PayoutStatements: { columns: { amount: true, reason: true } } },
      orderBy: (a, { asc }) => asc(a.fellowId),
    });
    expect(markedFellowAttendances).toEqual(
      fixture.fellowIds.toSorted().map((fellowId) => ({
        fellowId,
        attended: true,
        PayoutStatements: [{ amount: fixture.sessionAmount, reason: "MARK_SESSION_ATTENDANCE" }],
      })),
    );
  });

  test("two tabs mark the same fellow attended at the same moment", async ({ page, context }) => {
    await signInWithEmail(context, fixture.email);
    const fellowName = fixture.fellowNames[0];
    const fellowId = fixture.fellowIds[0];
    if (!fellowName || !fellowId) throw new Error("fixture has no fellow");

    const secondTab = await context.newPage();
    const submitButtons = await Promise.all(
      [page, secondTab].map(async (tab) => {
        const dialog = await openFellowAttendance(tab, fixture.sessionDate, fixture.schoolName);
        const fellowRow = await searchRows(tab, fellowName, dialog);
        await chooseRowAction(tab, fellowRow, "Mark attendance");
        const mark = tab.getByRole("dialog").filter({ hasText: "Select attendance" });
        await mark.getByRole("radio").first().click();
        return mark.getByRole("button", { name: "Submit" });
      }),
    );
    const actionResponses = [page, secondTab].map((tab) =>
      tab.waitForResponse((response) => response.request().headers()["next-action"] !== undefined),
    );
    await Promise.all(submitButtons.map((submit) => submit.click()));
    await Promise.all(actionResponses);

    const markedFellowAttendances = await db.query.fellowAttendance.findMany({
      where: (a, { and, eq }) => and(eq(a.sessionId, fixture.sessionId), eq(a.fellowId, fellowId)),
      columns: { attended: true },
      with: { PayoutStatements: { columns: { amount: true, reason: true } } },
    });
    expect(markedFellowAttendances).toEqual([
      {
        attended: true,
        PayoutStatements: [{ amount: fixture.sessionAmount, reason: "MARK_SESSION_ATTENDANCE" }],
      },
    ]);

    await page.reload();
    const reopened = await openFellowAttendance(page, fixture.sessionDate, fixture.schoolName);
    await expect(await searchRows(page, fellowName, reopened)).toContainText("Attended");
  });
});
