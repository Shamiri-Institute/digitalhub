import { type BrowserContext, expect, type Locator, type Page, test } from "@playwright/test";
import { and, eq, sql } from "drizzle-orm";

import { db } from "#/db/client";
import { interventionSession, student, triageEvent, triageEventAudit } from "#/db/schema";
import { generateSessionToken } from "#/tests/helpers";
import { getUrl } from "#/tests/pages/helpers";
import { sessionDisplayName } from "#/lib/utils";

/**
 * Hub coordinators and fellows change their own hub's records through the UI: drop out a student,
 * mark a session as occurred, document and edit a triage event. Each test saves, reloads and checks
 * what the page shows, and a coordinator in another hub does not see the school at all. The
 * database is read only to pick fixtures and to put rows back.
 */

// The dev server compiles each page on first use, which can take longer than the default.
test.describe.configure({ mode: "serial", timeout: 3 * 60 * 1000 });

type Coordinator = { email: string; hubId: string; implementerId: string };
type SchoolFixture = {
  visibleId: string;
  schoolName: string;
  studentId: string;
  studentName: string;
  sessionId: string;
  sessionLabel: string;
  sessionOccurred: boolean;
};
type TriageFixture = {
  email: string;
  visibleId: string;
  sessionId: string;
  sessionLabel: string;
  studentId: string;
  admissionNumber: string;
};

let coordinator: Coordinator;
let otherCoordinator: Coordinator;
let school: SchoolFixture;
let triage: TriageFixture;

/** Only users with one membership, so the session's active role is the one the test needs. */
const singleMembership = sql`(select count(*) from implementer_members o where o.user_id = m.user_id) = 1`;

test.beforeAll(async () => {
  const { rows: coordinators } = await db.execute<Coordinator>(sql`
    select u.email, h.assigned_hub_id as "hubId", h.implementer_id as "implementerId"
    from hub_coordinators h
    join implementer_members m on m.identifier = h.id and m.role = 'HUB_COORDINATOR'
    join users u on u.id = m.user_id and u.email is not null
    where h.assigned_hub_id is not null and ${singleMembership}
    order by u.email`);

  for (const candidate of coordinators) {
    const {
      rows: [row],
    } = await db.execute<SchoolFixture>(sql`
      select s.visible_id as "visibleId", s.school_name as "schoolName",
        st.id as "studentId", st.student_name as "studentName",
        i.id as "sessionId", sn.session_name as "sessionLabel", i.occurred as "sessionOccurred"
      from schools s
      join students st on st.school_id = s.id and st.archived_at is null
        and coalesce(st.dropped_out, false) = false and st.student_name is not null
      join intervention_sessions i on i.school_id = s.id
        and i.session_date < now() and coalesce(i.status::text, '') <> 'Cancelled'
      join session_names sn on sn.id = i.session_id
      where s.hub_id = ${candidate.hubId} and s.archived_at is null
        and coalesce(s.dropped_out, false) = false
      order by s.visible_id, st.id, i.session_date
      limit 1`);
    // Same organisation, different hub: the case a hub check exists for.
    const other = coordinators.find(
      (c) => c.implementerId === candidate.implementerId && c.hubId !== candidate.hubId,
    );
    if (row && other) {
      coordinator = candidate;
      otherCoordinator = other;
      // The sessions table shows the display name ("S4"), not the stored name ("s4").
      school = { ...row, sessionLabel: sessionDisplayName(row.sessionLabel) ?? row.sessionLabel };
      break;
    }
  }
  if (!school) {
    throw new Error(
      "seed the database first: no coordinator with a school that has students and a past session, " +
        "and another coordinator in the same organisation",
    );
  }
  // The seed marks every past session as occurred, so make the chosen one "not yet occurred" for
  // the mark-occurred test. afterAll puts the original value back.
  await db
    .update(interventionSession)
    .set({ occurred: false })
    .where(eq(interventionSession.id, school.sessionId));

  const {
    rows: [fellowRow],
  } = await db.execute<TriageFixture>(sql`
    select u.email, s.visible_id as "visibleId", i.id as "sessionId",
      sn.session_name as "sessionLabel", st.id as "studentId",
      st.admission_number as "admissionNumber"
    from intervention_groups g
    join implementer_members m on m.identifier = g.leader_id and m.role = 'FELLOW'
    join users u on u.id = m.user_id and u.email is not null
    join schools s on s.id = g.school_id
    join intervention_sessions i on i.school_id = s.id and i.occurred
    join session_names sn on sn.id = i.session_id
    join students st on st.assigned_group_id = g.id and st.archived_at is null
      and st.admission_number is not null
    where ${singleMembership} and m.implementer_id = ${coordinator.implementerId}
      and not exists (
        select 1 from triage_events t where t.student_id = st.id and t.session_id = i.id)
    order by u.email, i.session_date, st.id
    limit 1`);
  if (!fellowRow) throw new Error("seed the database first: no fellow with an occurred session");
  triage = {
    ...fellowRow,
    sessionLabel: sessionDisplayName(fellowRow.sessionLabel) ?? fellowRow.sessionLabel,
  };
});

test.afterAll(async () => {
  if (school) {
    await db
      .update(interventionSession)
      .set({ occurred: school.sessionOccurred })
      .where(eq(interventionSession.id, school.sessionId));
  }
});

// Each test's undo steps run in afterEach, not in a finally block: when a test times out,
// Playwright abandons its body but still runs the hooks.
let undo: (() => Promise<unknown>)[] = [];
test.afterEach(async () => {
  for (const step of undo.reverse()) {
    await step();
  }
  undo = [];
});

async function signIn(context: BrowserContext, email: string) {
  await context.clearCookies();
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

/** A row by the exact text of one of its cells, after searching the table for it. */
async function rowWithCell(page: Page, scope: Locator, text: string) {
  await scope.getByPlaceholder("Search...").fill(text);
  return scope
    .getByRole("row")
    .filter({ has: page.getByRole("cell", { name: text, exact: true }) });
}

/**
 * A sessions-table row by its session name. That column is not searchable, so show up to 50 rows
 * a page instead (a school has at most 15 sessions).
 */
async function sessionRow(page: Page, scope: Locator, label: string) {
  await scope.getByRole("combobox").filter({ hasText: "Show 10" }).click();
  await page.getByRole("option", { name: "Show 50" }).click();
  return scope
    .getByRole("row")
    .filter({ has: page.getByRole("cell", { name: label, exact: true }) });
}

/** Opens a row's actions menu. Rows re-render while their data loads, so retry the click. */
async function openRowMenu(page: Page, row: Locator) {
  await expect(async () => {
    await row.getByRole("cell").last().click();
    await expect(page.getByRole("menu")).toBeVisible({ timeout: 2000 });
  }).toPass({ timeout: 30_000 });
}

test("a hub coordinator drops out a student in their hub", async ({ page, context }) => {
  await signIn(context, coordinator.email);
  const studentsPage = getUrl(`/hc/schools/${school.visibleId}/students`);
  await page.goto(studentsPage, { waitUntil: "networkidle" });
  undo.push(() =>
    db
      .update(student)
      .set({ droppedOut: false, dropOutReason: null, droppedOutAt: null })
      .where(eq(student.id, school.studentId)),
  );

  const main = page.getByRole("main");
  await openRowMenu(page, await rowWithCell(page, main, school.studentName));
  await page.getByRole("menuitem", { name: "Drop-out student" }).click();
  const dialog = page.getByRole("dialog", { name: "Drop out student" });
  await dialog.getByRole("combobox", { name: "Select reason *" }).click();
  await page.getByRole("option").first().click();
  await dialog.getByRole("button", { name: "Submit" }).click();
  // Submit only opens a confirmation; Confirm saves.
  const confirm = page.getByRole("dialog", { name: "Confirm drop out" });
  await confirm.getByRole("button", { name: "Confirm" }).click();
  await expect(confirm).toBeHidden();

  await page.reload({ waitUntil: "networkidle" });
  await expect(await rowWithCell(page, main, school.studentName)).toContainText("Inactive");
});

test("a hub coordinator marks a session in their hub as occurred", async ({ page, context }) => {
  await signIn(context, coordinator.email);
  await page.goto(getUrl(`/hc/schools/${school.visibleId}/sessions`), {
    waitUntil: "networkidle",
  });

  const main = page.getByRole("main");
  await openRowMenu(page, await sessionRow(page, main, school.sessionLabel));
  await page.getByRole("menuitem", { name: "Mark session occurrence" }).click();
  const dialog = page
    .getByRole("dialog")
    .filter({ has: page.getByRole("heading", { name: "Mark session occurrence" }) });
  // The radios are unlabelled; "Attended" is the first option.
  await dialog.getByRole("radio").first().click();
  await dialog.getByRole("button", { name: "Submit" }).click();
  // Submit only opens a confirmation, whose title is not linked to the dialog; Confirm saves.
  const confirm = page.getByRole("dialog").filter({ hasText: "Are you sure?" });
  await confirm.getByRole("button", { name: "Confirm" }).click();
  await expect(confirm).toBeHidden();

  await page.reload({ waitUntil: "networkidle" });
  await expect(await sessionRow(page, main, school.sessionLabel)).toContainText("Attended");
});

test("a hub coordinator in another hub does not see the school", async ({ page, context }) => {
  await signIn(context, otherCoordinator.email);
  await page.goto(getUrl("/hc/schools"), { waitUntil: "networkidle" });

  const main = page.getByRole("main");
  await expect(await rowWithCell(page, main, school.schoolName)).toHaveCount(0);
});

test("a fellow documents a triage event and edits its note", async ({ page, context }) => {
  const note = `e2e-2212-${Date.now()}`;
  await signIn(context, triage.email);
  const sessionsPage = getUrl(`/fel/schools/${triage.visibleId}/sessions`);

  async function openStudentMenu() {
    await page.goto(sessionsPage, { waitUntil: "networkidle" });
    await openRowMenu(page, await sessionRow(page, page.getByRole("main"), triage.sessionLabel));
    await page.getByRole("menuitem", { name: "Mark student attendance" }).click();
    const attendance = page.getByRole("dialog", { name: "Mark student attendance" });
    // The student list loads after the dialog opens; search only once it has rows.
    await expect(attendance.getByRole("checkbox", { name: "Select row" }).first()).toBeVisible();
    // The name column is not searchable; the admission number column is.
    await openRowMenu(page, await rowWithCell(page, attendance, triage.admissionNumber));
  }

  undo.push(async () => {
    const events = await db
      .select({ id: triageEvent.id })
      .from(triageEvent)
      .where(
        and(
          eq(triageEvent.studentId, triage.studentId),
          eq(triageEvent.sessionId, triage.sessionId),
        ),
      );
    for (const { id } of events) {
      await db.delete(triageEventAudit).where(eq(triageEventAudit.triageEventId, id));
      await db.delete(triageEvent).where(eq(triageEvent.id, id));
    }
  });

  await openStudentMenu();
  await page.getByRole("menuitem", { name: "Triage occurred" }).click();
  const form = page.getByRole("dialog", { name: "Document triage" });
  await form.getByRole("combobox", { name: "Risk screen outcome (required)" }).click();
  await page.getByRole("option", { name: "All NO (Risk negative)" }).click();
  await form.getByRole("combobox", { name: "Action taken (required)" }).click();
  await page.getByRole("option", { name: "Provided peer counselling" }).click();
  await form.getByRole("button", { name: "Save triage" }).click();
  await expect(form).toBeHidden();

  await openStudentMenu();
  await page.getByRole("menuitem", { name: "Edit triage" }).click();
  await form.getByRole("combobox", { name: "Risk screen outcome (required)" }).click();
  await page.getByRole("option", { name: "All NO (Risk negative)" }).click();
  await form.getByRole("combobox", { name: "Action taken (required)" }).click();
  await page.getByRole("option", { name: "Provided peer counselling" }).click();
  await form.getByRole("textbox", { name: /Short note/ }).fill(note);
  await form.getByRole("button", { name: "Save triage" }).click();
  await expect(form).toBeHidden();

  await openStudentMenu();
  await page.getByRole("menuitem", { name: "View triage" }).click();
  const view = page.getByRole("dialog", { name: "View triage" });
  await expect(view.getByRole("textbox", { name: /Short note/ })).toHaveValue(note);
});
