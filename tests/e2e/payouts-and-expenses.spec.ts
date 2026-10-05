import { type BrowserContext, expect, type Locator, type Page, test } from "@playwright/test";
import { differenceInCalendarWeeks } from "date-fns";
import { and, eq, gte, sql } from "drizzle-orm";

import { db } from "#/db/client";
import { fellowAttendance, payoutStatements } from "#/db/schema";
import { generateSessionToken } from "#/tests/helpers";
import { getUrl } from "#/tests/pages/helpers";

/**
 * Money flows through the UI: payout confirmation and fellow attendance
 * (which writes payout statements). Each test saves, reloads and checks what the page shows. The
 * database is read only to pick fixtures and to restore what a test changed.
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
  const { rows } = await db.execute<{ id: string; hubId: string; email: string }>(sql`
    select p.id, p.${sql.raw(hubColumn)} as "hubId", u.email from ${sql.raw(table)} p
    join implementer_members m on m.identifier = p.id and m.role = ${role}
    join users u on u.id = m.user_id and u.email is not null
    where p.${sql.raw(hubColumn)} is not null
      and (select count(*) from implementer_members o where o.user_id = m.user_id) = 1
    order by p.id`);
  return rows;
}

/** Rows containing `text`, after typing it into every table search box in `scope`. */
async function searchRows(page: Page, scope: Page | Locator, text: string) {
  await scope.getByPlaceholder("Search...").first().waitFor();
  for (const box of await scope.getByPlaceholder("Search...").all()) {
    await box.fill(text);
  }
  return scope.getByRole("row").filter({ hasText: text });
}

test.describe("payout confirmation", () => {
  const startedAt = new Date();

  test.afterAll(async () => {
    await db
      .update(payoutStatements)
      .set({ confirmedAt: null, confirmedBy: null })
      .where(gte(payoutStatements.confirmedAt, startedAt));
  });

  test("an ops user confirms a payout run", async ({ page, context }) => {
    const [ops] = await signableProfiles("ops_users", "OPERATIONS", "implementer_id");
    if (!ops) throw new Error("seed the database first: no ops user");
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
  });
});

test.describe("fellow attendance", () => {
  type Fixture = {
    attendanceId: number;
    sessionDate: Date;
    schoolName: string;
    fellowName: string;
    email: string;
    hubId: string;
  };
  let fixture: Fixture;
  let original: typeof fellowAttendance.$inferSelect;
  const startedAt = new Date();

  test.beforeAll(async () => {
    // An attended, unprocessed session marked for a fellow of a supervisor who can sign in.
    const {
      rows: [row],
    } = await db.execute<Omit<Fixture, "sessionDate"> & { sessionDate: string }>(sql`
      select fa.id as "attendanceId", s.session_date as "sessionDate",
        sc.school_name as "schoolName", f.fellow_name as "fellowName", u.email,
        sc.hub_id as "hubId"
      from fellow_attendances fa
      join intervention_sessions s on s.id = fa.session_id and s.occurred
      join schools sc on sc.id = s.school_id
      join fellows f on f.id = fa.fellow_id and f.hub_id = sc.hub_id
      join implementer_members m on m.identifier = f.supervisor_id and m.role = 'SUPERVISOR'
      join users u on u.id = m.user_id and u.email is not null
      where fa.attended and fa.processed_at is null
        and (select count(*) from implementer_members o where o.user_id = m.user_id) = 1
      order by s.session_date desc, fa.id
      limit 1`);
    if (!row) throw new Error("seed the database first: no attended, unprocessed attendance");
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

  /** The schedule's list view, moved back to the week of the fixture's session. */
  async function openSessionWeek(page: Page) {
    await page.goto(getUrl("/sc/schedule?mode=list"), { waitUntil: "networkidle" });
    const weeksBack = differenceInCalendarWeeks(new Date(), fixture.sessionDate);
    for (let i = 0; i < weeksBack; i++) {
      await page.getByRole("button", { name: "Previous" }).click();
      await page.waitForLoadState("networkidle");
    }
    return page.getByRole("row").filter({ hasText: fixture.schoolName });
  }

  async function openFellowAttendance(page: Page) {
    const sessionRow = (await openSessionWeek(page)).first();
    await sessionRow.getByRole("cell").last().click();
    await page.getByRole("menuitem", { name: "Mark fellow attendance" }).click();
    return page.getByRole("dialog", { name: "Mark fellow attendance" });
  }

  test("a supervisor marks their fellow missed", async ({ page, context }) => {
    await signIn(context, fixture.email);
    const dialog = await openFellowAttendance(page);
    const fellowRow = await searchRows(page, dialog, fixture.fellowName);
    await expect(fellowRow).toContainText("Attended");

    await fellowRow.getByRole("cell").last().click();
    await page.getByRole("menuitem", { name: "Mark attendance" }).click();
    const mark = page.getByRole("dialog").filter({ hasText: "Select attendance" });
    await mark.getByRole("radio").nth(1).click();
    await mark.getByRole("combobox", { name: "Select reason for above" }).click();
    await page.getByRole("option").first().click();
    await mark.getByRole("button", { name: "Submit" }).click();
    await expect(mark).toBeHidden();

    await page.reload({ waitUntil: "networkidle" });
    const reopened = await openFellowAttendance(page);
    await expect(await searchRows(page, reopened, fixture.fellowName)).toContainText("Missed");
  });

  test("a supervisor in another hub does not see the session", async ({ page, context }) => {
    const supervisors = await signableProfiles("supervisors", "SUPERVISOR", "hub_id");
    const outsider = supervisors.find((s) => s.hubId !== fixture.hubId);
    if (!outsider) throw new Error("seed the database first: no supervisor in another hub");
    await signIn(context, outsider.email);

    const sessionRows = await openSessionWeek(page);
    await expect(page.getByRole("button", { name: "Schedule a session" })).toBeVisible();
    await expect(sessionRows).toHaveCount(0);
  });
});
