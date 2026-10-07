import { type BrowserContext, expect, type Locator, type Page, test } from "@playwright/test";
import { differenceInCalendarWeeks, format } from "date-fns";
import { and, eq, gte, inArray, sql } from "drizzle-orm";

import { db } from "#/db/client";
import { fellowAttendance, payoutStatements } from "#/db/schema";
import { generateSessionToken } from "#/tests/helpers";
import { getUrl } from "#/tests/pages/helpers";

/**
 * Money flows through the UI: payout runs and fellow attendance (which writes payout statements).
 * Each test saves, reloads, checks what the page shows and reads the stored rows back. The database
 * is otherwise used only to pick fixtures and to restore what a test changed.
 */

// The dev server compiles each page on first use, which can take longer than the default.
test.describe.configure({ mode: "serial", timeout: 3 * 60 * 1000 });

async function signIn(context: BrowserContext, email: string) {
  await context.addCookies([
    {
      name: "next-auth.session-token",
      value: await generateSessionToken(email),
      domain: "localhost",
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
}

/** A user with one membership, so the session's active role is the one asked for. */
async function signableProfiles(table: string, role: string, hubColumn: string) {
  const { rows } = await db.execute<{ id: string; hubId: string; email: string; userId: string }>(
    sql`
    select p.id, p.${sql.raw(hubColumn)} as "hubId", u.email, u.id as "userId"
    from ${sql.raw(table)} p
    join implementer_members m on m.identifier = p.id and m.role = ${role}
    join users u on u.id = m.user_id and u.email is not null
    where p.${sql.raw(hubColumn)} is not null
      and (select count(*) from implementer_members o where o.user_id = m.user_id) = 1
    order by p.id`,
  );
  return rows;
}

/** Only users with one membership, in an organisation that runs the default project. */
const signableMember = sql`(select count(*) from implementer_members o where o.user_id = m.user_id) = 1
  and exists (select 1 from hubs h join projects p on p.id = h.project_id
    where h.implementer_id = m.implementer_id and p.is_default)`;

/** Rows containing `text`, after typing it into every table search box in `scope`. */
async function searchRows(page: Page, scope: Page | Locator, text: string) {
  await scope.getByPlaceholder("Search...").first().waitFor();
  for (const box of await scope.getByPlaceholder("Search...").all()) {
    await box.fill(text);
  }
  return scope.getByRole("row").filter({ hasText: text });
}

/** The schedule's list view, moved back to the week of `sessionDate`; rows at `schoolName`. */
async function openSessionWeek(page: Page, sessionDate: Date, schoolName: string) {
  await page.goto(getUrl("/sc/schedule?mode=list"), { waitUntil: "networkidle" });
  const weeksBack = differenceInCalendarWeeks(new Date(), sessionDate);
  for (let i = 0; i < weeksBack; i++) {
    await page.getByRole("button", { name: "Previous" }).click();
    await page.waitForLoadState("networkidle");
  }
  return page.getByRole("row").filter({ hasText: schoolName });
}

async function openFellowAttendance(page: Page, sessionDate: Date, schoolName: string) {
  const sessionRow = (await openSessionWeek(page, sessionDate, schoolName)).first();
  await sessionRow.getByRole("cell").last().click();
  await page.getByRole("menuitem", { name: "Mark fellow attendance" }).click();
  return page.getByRole("dialog", { name: "Mark fellow attendance" });
}

test.describe("payout runs", () => {
  type Fixture = { attendanceId: number; fellowId: string; sessionAmount: number };
  let ops: Awaited<ReturnType<typeof signableProfiles>>[number];
  let fixture: Fixture;
  let insertedPayoutId: string;
  const startedAt = new Date();

  test.beforeAll(async () => {
    const [firstOps] = await signableProfiles("ops_users", "OPERATIONS", "implementer_id");
    if (!firstOps) throw new Error("seed the database first: no ops user");
    ops = firstOps;

    // An attendance the next payout run picks up: attended, unprocessed, at an occurred session,
    // for an active fellow in a default-project hub. The seed executes every statement it writes,
    // so give it an unexecuted one; afterAll removes it.
    const {
      rows: [row],
    } = await db.execute<Fixture>(sql`
      select fa.id as "attendanceId", f.id as "fellowId", sn.amount as "sessionAmount"
      from fellow_attendances fa
      join intervention_sessions i on i.id = fa.session_id and i.occurred
      join session_names sn on sn.id = i.session_id and sn.amount > 0
      join fellows f on f.id = fa.fellow_id and coalesce(f.dropped_out, false) = false
      join hubs h on h.id = f.hub_id
      join projects p on p.id = h.project_id and p.is_default
      where fa.attended and fa.processed_at is null
        and not exists (select 1 from payout_statements ps where ps.fellow_attendance_id = fa.id)
      order by fa.id
      limit 1`);
    if (!row) throw new Error("seed the database first: no attended, unprocessed attendance");
    fixture = row;
    const [inserted] = await db
      .insert(payoutStatements)
      .values({
        fellowAttendanceId: fixture.attendanceId,
        fellowId: fixture.fellowId,
        amount: fixture.sessionAmount,
        reason: "MARK_SESSION_ATTENDANCE",
        createdBy: ops.userId,
      })
      .returning({ id: payoutStatements.id });
    if (!inserted) throw new Error("could not insert the payout statement fixture");
    insertedPayoutId = inserted.id;
  });

  test.afterAll(async () => {
    // A run touches every eligible row, so undo by time: nothing else sets these columns.
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
    if (insertedPayoutId) {
      await db.delete(payoutStatements).where(eq(payoutStatements.id, insertedPayoutId));
    }
  });

  test("an ops user triggers a payout run", async ({ page, context }) => {
    await signIn(context, ops.email);
    await page.goto(getUrl("/ops/reporting/expenses/payout-history"), {
      waitUntil: "networkidle",
    });

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

    // The run is listed with the sum of the statements it executed.
    const {
      rows: [run],
    } = await db.execute<{ expectedPayoutAmount: number }>(sql`
      select sum(amount)::int as "expectedPayoutAmount" from payout_statements
      where executed_at = ${executedAt.toISOString()}`);
    await page.reload({ waitUntil: "networkidle" });
    const runRow = page
      .getByRole("row")
      .filter({ hasText: format(executedAt, "dd-MM-yyyy HH:mm:ss") });
    await expect(runRow).toContainText(String(run?.expectedPayoutAmount));
  });

  test("an ops user confirms a payout run", async ({ page, context }) => {
    await signIn(context, ops.email);
    await page.goto(getUrl("/ops/reporting/expenses/payout-history"), {
      waitUntil: "networkidle",
    });

    const unconfirmed = page
      .getByRole("row")
      .filter({ has: page.getByRole("button", { name: "Confirm Payout", exact: true }) })
      .first();
    const dateAdded = (await unconfirmed.getByRole("cell").nth(1).innerText()).trim();
    await unconfirmed.getByRole("button", { name: "Confirm Payout", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Confirm Payout" });
    await dialog.getByRole("button", { name: "Confirm Payout" }).click();
    await expect(dialog).toBeHidden();

    // Runs are listed newest first, so the run stays on the first page. The table search does
    // not match the formatted date, so find the row by its text instead.
    await page.reload({ waitUntil: "networkidle" });
    const row = page.getByRole("row").filter({ hasText: dateAdded });
    await expect(row.getByRole("button", { name: "Confirmed" })).toBeDisabled();

    // Every statement of the run is confirmed by this user, and only that run's statements.
    const confirmedPayouts = await db
      .select({
        executedAt: payoutStatements.executedAt,
        confirmedBy: payoutStatements.confirmedBy,
      })
      .from(payoutStatements)
      .where(gte(payoutStatements.confirmedAt, startedAt));
    expect(confirmedPayouts.length).toBeGreaterThan(0);
    for (const confirmedPayout of confirmedPayouts) {
      expect(confirmedPayout.confirmedBy).toBe(ops.userId);
      expect(format(confirmedPayout.executedAt ?? 0, "dd-MM-yyyy HH:mm:ss")).toBe(dateAdded);
    }
  });
});

test.describe("fellow attendance", () => {
  type Fixture = {
    attendanceId: number;
    sessionDate: Date;
    sessionAmount: number;
    schoolName: string;
    fellowName: string;
    email: string;
    hubId: string;
  };
  let fixture: Fixture;
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
        sn.amount as "sessionAmount", sc.school_name as "schoolName",
        f.fellow_name as "fellowName", u.email, sc.hub_id as "hubId"
      from fellow_attendances fa
      join intervention_sessions s on s.id = fa.session_id and s.occurred
      join session_names sn on sn.id = s.session_id and sn.amount > 0
      join schools sc on sc.id = s.school_id
      join fellows f on f.id = fa.fellow_id and f.hub_id = sc.hub_id
        and coalesce(f.dropped_out, false) = false
      join intervention_groups g on g.school_id = sc.id and g.leader_id = f.id
        and (sn."sessionType" <> 'INTERVENTION' or g.group_type = 'TREATMENT')
      join implementer_members m on m.identifier = f.supervisor_id and m.role = 'SUPERVISOR'
      join users u on u.id = m.user_id and u.email is not null
      where fa.attended and fa.processed_at is null and ${signableMember}
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
  });

  test.afterAll(async () => {
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
    await signIn(context, fixture.email);
    const dialog = await openFellowAttendance(page, fixture.sessionDate, fixture.schoolName);
    const fellowRow = await searchRows(page, dialog, fixture.fellowName);
    await expect(fellowRow).toContainText("Attended");

    await fellowRow.getByRole("cell").last().click();
    await page.getByRole("menuitem", { name: "Mark attendance" }).click();
    const mark = page.getByRole("dialog").filter({ hasText: "Select attendance" });
    await mark.getByRole("radio").nth(1).click();
    await mark.getByRole("combobox", { name: "Select reason for above" }).click();
    const absenceReason = (await page.getByRole("option").first().innerText()).trim();
    await page.getByRole("option").first().click();
    await mark.getByRole("button", { name: "Submit" }).click();
    await expect(mark).toBeHidden();

    await page.reload({ waitUntil: "networkidle" });
    const reopened = await openFellowAttendance(page, fixture.sessionDate, fixture.schoolName);
    await expect(await searchRows(page, reopened, fixture.fellowName)).toContainText("Missed");

    const [markedFellowAttendance] = await db
      .select({
        attended: fellowAttendance.attended,
        absenceReason: fellowAttendance.absenceReason,
      })
      .from(fellowAttendance)
      .where(eq(fellowAttendance.id, fixture.attendanceId));
    expect(markedFellowAttendance).toEqual({ attended: false, absenceReason });
    // The paid session is reversed with one negative statement of the session's amount.
    const reversals = await db
      .select({ amount: payoutStatements.amount, reason: payoutStatements.reason })
      .from(payoutStatements)
      .where(
        and(
          eq(payoutStatements.fellowAttendanceId, fixture.attendanceId),
          gte(payoutStatements.createdAt, startedAt),
        ),
      );
    expect(reversals).toEqual([
      { amount: -fixture.sessionAmount, reason: "UNMARK_SESSION_ATTENDANCE" },
    ]);
  });

  test("a supervisor in another hub does not see the session", async ({ page, context }) => {
    const supervisors = await signableProfiles("supervisors", "SUPERVISOR", "hub_id");
    const outsider = supervisors.find((s) => s.hubId !== fixture.hubId);
    if (!outsider) throw new Error("seed the database first: no supervisor in another hub");
    await signIn(context, outsider.email);

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
      join session_names sn on sn.id = i.session_id and sn."sessionType" = 'INTERVENTION'
        and sn.amount > 0
      join schools s on s.id = i.school_id
      join intervention_groups g on g.school_id = s.id and g.group_type = 'TREATMENT'
      join fellows f on f.id = g.leader_id and coalesce(f.dropped_out, false) = false
        and f.fellow_name is not null
      join supervisors sv on sv.id = f.supervisor_id and sv.hub_id = f.hub_id
        and sv.hub_id = s.hub_id
      join implementer_members m on m.identifier = sv.id and m.role = 'SUPERVISOR'
      join users u on u.id = m.user_id and u.email is not null
      where i.occurred and ${signableMember}
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
    await signIn(context, fixture.email);
    const dialog = await openFellowAttendance(page, fixture.sessionDate, fixture.schoolName);
    for (const fellowName of fixture.fellowNames) {
      const fellowRow = await searchRows(page, dialog, fellowName);
      await fellowRow.getByRole("checkbox", { name: "Select row" }).check();
    }
    await dialog.getByRole("button", { name: "Mark fellow attendance" }).click();
    const mark = page.getByRole("dialog").filter({ hasText: "Select attendance" });
    await expect(mark).toContainText("2 fellows");
    await mark.getByRole("radio").first().click();
    await mark.getByRole("button", { name: "Submit" }).click();
    await expect(mark).toBeHidden();

    await page.reload({ waitUntil: "networkidle" });
    const reopened = await openFellowAttendance(page, fixture.sessionDate, fixture.schoolName);
    for (const fellowName of fixture.fellowNames) {
      await expect(await searchRows(page, reopened, fellowName)).toContainText("Attended");
    }

    // One attended row per fellow, each with one payout statement of the session's amount.
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
    await signIn(context, fixture.email);
    const fellowName = fixture.fellowNames[0];
    const fellowId = fixture.fellowIds[0];
    if (!fellowName || !fellowId) throw new Error("fixture has no fellow");

    const secondTab = await context.newPage();
    const submitButtons = await Promise.all(
      [page, secondTab].map(async (tab) => {
        const dialog = await openFellowAttendance(tab, fixture.sessionDate, fixture.schoolName);
        const fellowRow = await searchRows(tab, dialog, fellowName);
        await fellowRow.getByRole("cell").last().click();
        await tab.getByRole("menuitem", { name: "Mark attendance" }).click();
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

    await page.reload({ waitUntil: "networkidle" });
    const reopened = await openFellowAttendance(page, fixture.sessionDate, fixture.schoolName);
    await expect(await searchRows(page, reopened, fellowName)).toContainText("Attended");
  });
});
