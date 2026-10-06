import { type BrowserContext, expect, type Locator, type Page, test } from "@playwright/test";
import { and, asc, eq, inArray, sql } from "drizzle-orm";

import { db } from "#/db/client";
import {
  fellow,
  interventionSession,
  student,
  supervisor,
  triageEvent,
  triageEventAudit,
} from "#/db/schema";
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
  /** A fellow who leads another group at the same school, with no triage at the session yet. */
  otherFellowEmail: string;
  otherStudentId: string;
  otherAdmissionNumber: string;
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
      st.admission_number as "admissionNumber", other_user.email as "otherFellowEmail",
      other_student.id as "otherStudentId",
      other_student.admission_number as "otherAdmissionNumber"
    from intervention_groups g
    join implementer_members m on m.identifier = g.leader_id and m.role = 'FELLOW'
    join users u on u.id = m.user_id and u.email is not null
    join schools s on s.id = g.school_id
    join intervention_sessions i on i.school_id = s.id and i.occurred
    join session_names sn on sn.id = i.session_id
    join students st on st.assigned_group_id = g.id and st.archived_at is null
      and st.admission_number is not null
    join intervention_groups other_group on other_group.school_id = s.id
      and other_group.leader_id <> g.leader_id
    join implementer_members other_member on other_member.identifier = other_group.leader_id
      and other_member.role = 'FELLOW'
      and (select count(*) from implementer_members o where o.user_id = other_member.user_id) = 1
    join users other_user on other_user.id = other_member.user_id and other_user.email is not null
    join students other_student on other_student.assigned_group_id = other_group.id
      and other_student.archived_at is null and other_student.admission_number is not null
    where ${singleMembership} and m.implementer_id = ${coordinator.implementerId}
      and not exists (
        select 1 from triage_events t where t.student_id = st.id and t.session_id = i.id)
      and not exists (
        select 1 from triage_events t join students s2 on s2.id = t.student_id
        where s2.assigned_group_id = other_group.id and t.session_id = i.id)
    order by u.email, i.session_date, st.id, other_user.email, other_student.id
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

test("a fellow documents a triage event; another fellow at the school does not see it", async ({
  page,
  context,
}) => {
  const note = `e2e-2212-${Date.now()}`;
  await signIn(context, triage.email);
  const sessionsPage = getUrl(`/fel/schools/${triage.visibleId}/sessions`);

  async function openAttendance() {
    await page.goto(sessionsPage, { waitUntil: "networkidle" });
    await openRowMenu(page, await sessionRow(page, page.getByRole("main"), triage.sessionLabel));
    await page.getByRole("menuitem", { name: "Mark student attendance" }).click();
    const attendance = page.getByRole("dialog", { name: "Mark student attendance" });
    // The student list loads after the dialog opens; search only once it has rows.
    await expect(attendance.getByRole("checkbox", { name: "Select row" }).first()).toBeVisible();
    return attendance;
  }

  async function openStudentMenu(admissionNumber = triage.admissionNumber) {
    const attendance = await openAttendance();
    // The name column is not searchable; the admission number column is.
    await openRowMenu(page, await rowWithCell(page, attendance, admissionNumber));
  }

  const form = page.getByRole("dialog", { name: "Document triage" });
  async function documentTriage(admissionNumber: string) {
    await openStudentMenu(admissionNumber);
    await page.getByRole("menuitem", { name: "Triage occurred" }).click();
    await form.getByRole("combobox", { name: "Risk screen outcome (required)" }).click();
    await page.getByRole("option", { name: "All NO (Risk negative)" }).click();
    await form.getByRole("combobox", { name: "Action taken (required)" }).click();
    await page.getByRole("option", { name: "Provided peer counselling" }).click();
    await form.getByRole("button", { name: "Save triage" }).click();
    await expect(form).toBeHidden();
  }

  undo.push(async () => {
    const events = await db
      .select({ id: triageEvent.id })
      .from(triageEvent)
      .where(
        and(
          inArray(triageEvent.studentId, [triage.studentId, triage.otherStudentId]),
          eq(triageEvent.sessionId, triage.sessionId),
        ),
      );
    for (const { id } of events) {
      await db.delete(triageEventAudit).where(eq(triageEventAudit.triageEventId, id));
      await db.delete(triageEvent).where(eq(triageEvent.id, id));
    }
  });

  await documentTriage(triage.admissionNumber);

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

  // Another fellow at the school documents triage for a student of their own group. Their
  // session summary counts only that event, not the first fellow's ("2 students triaged").
  await signIn(context, triage.otherFellowEmail);
  await documentTriage(triage.otherAdmissionNumber);
  const otherAttendance = await openAttendance();
  await expect(otherAttendance.getByText("1 student triaged", { exact: true })).toBeVisible();
});

test("a borrowed fellow's triage event and supervisor list use the session's hub", async ({
  page,
  context,
}) => {
  // The seed has no borrowed fellow, so move a fellow's home hub to another hub of the same
  // organisation. The session has no hub of its own, so its hub comes from its school.
  const {
    rows: [borrowed],
  } = await db.execute<{
    email: string;
    fellowId: string;
    fellowHomeHubId: string | null;
    otherHubId: string;
    visibleId: string;
    sessionId: string;
    sessionHubId: string | null;
    schoolHubId: string;
    sessionLabel: string;
    studentId: string;
    admissionNumber: string;
  }>(sql`
    select u.email, f.id as "fellowId", f.hub_id as "fellowHomeHubId",
      other_hub.id as "otherHubId", s.visible_id as "visibleId", i.id as "sessionId",
      i.hub_id as "sessionHubId", s.hub_id as "schoolHubId", sn.session_name as "sessionLabel",
      st.id as "studentId", st.admission_number as "admissionNumber"
    from intervention_groups g
    join fellows f on f.id = g.leader_id
    join implementer_members m on m.identifier = f.id and m.role = 'FELLOW'
    join users u on u.id = m.user_id and u.email is not null
    join schools s on s.id = g.school_id and s.hub_id is not null
    join hubs school_hub on school_hub.id = s.hub_id
    join hubs other_hub on other_hub.implementer_id = school_hub.implementer_id
      and other_hub.id <> s.hub_id
      and exists (select 1 from supervisors sup where sup.hub_id = other_hub.id)
    join intervention_sessions i on i.school_id = s.id and i.occurred
    join session_names sn on sn.id = i.session_id
    join students st on st.assigned_group_id = g.id and st.archived_at is null
      and st.admission_number is not null
    where ${singleMembership} and m.implementer_id = ${coordinator.implementerId}
      and not exists (
        select 1 from triage_events t where t.student_id = st.id and t.session_id = i.id)
    order by u.email, other_hub.id, i.session_date, st.id
    limit 1`);
  if (!borrowed) throw new Error("seed the database first: no fellow with an occurred session");

  await db
    .update(fellow)
    .set({ hubId: borrowed.otherHubId })
    .where(eq(fellow.id, borrowed.fellowId));
  await db
    .update(interventionSession)
    .set({ hubId: null })
    .where(eq(interventionSession.id, borrowed.sessionId));
  undo.push(
    () =>
      db
        .update(fellow)
        .set({ hubId: borrowed.fellowHomeHubId })
        .where(eq(fellow.id, borrowed.fellowId)),
    () =>
      db
        .update(interventionSession)
        .set({ hubId: borrowed.sessionHubId })
        .where(eq(interventionSession.id, borrowed.sessionId)),
    async () => {
      const events = await db
        .select({ id: triageEvent.id })
        .from(triageEvent)
        .where(
          and(
            eq(triageEvent.studentId, borrowed.studentId),
            eq(triageEvent.sessionId, borrowed.sessionId),
          ),
        );
      for (const { id } of events) {
        await db.delete(triageEventAudit).where(eq(triageEventAudit.triageEventId, id));
        await db.delete(triageEvent).where(eq(triageEvent.id, id));
      }
    },
  );
  const sessionHubSupervisors = await db
    .select({ name: supervisor.supervisorName })
    .from(supervisor)
    .where(eq(supervisor.hubId, borrowed.schoolHubId))
    .orderBy(asc(supervisor.supervisorName));

  await signIn(context, borrowed.email);
  await page.goto(getUrl(`/fel/schools/${borrowed.visibleId}/sessions`), {
    waitUntil: "networkidle",
  });
  const sessionLabel = sessionDisplayName(borrowed.sessionLabel) ?? borrowed.sessionLabel;
  await openRowMenu(page, await sessionRow(page, page.getByRole("main"), sessionLabel));
  await page.getByRole("menuitem", { name: "Mark student attendance" }).click();
  const attendance = page.getByRole("dialog", { name: "Mark student attendance" });
  await expect(attendance.getByRole("checkbox", { name: "Select row" }).first()).toBeVisible();
  const form = page.getByRole("dialog", { name: "Document triage" });
  // The table re-renders while the dev server compiles, which can close the menu: retry both.
  await expect(async () => {
    await openRowMenu(page, await rowWithCell(page, attendance, borrowed.admissionNumber));
    await page.getByRole("menuitem", { name: "Triage occurred" }).click({ timeout: 5000 });
    await expect(form).toBeVisible({ timeout: 2000 });
  }).toPass({ timeout: 60_000 });
  await form.getByRole("combobox", { name: "Risk screen outcome (required)" }).click();
  await page.getByRole("option", { name: "All NO (Risk negative)" }).click();
  await form.getByRole("combobox", { name: "Action taken (required)" }).click();
  await page.getByRole("option", { name: "Referred to supervisor (risk-negative)" }).click();
  await form.getByRole("combobox", { name: "Supervisor (in the session hub)" }).click();
  // The list holds the supervisors of the session's hub, not of the fellow's home hub.
  await expect(page.getByRole("option")).toHaveText(sessionHubSupervisors.map((s) => s.name ?? ""));
  await page.getByRole("option").first().click();
  await form.getByRole("combobox", { name: "Supervisor handoff status (required)" }).click();
  await page.getByRole("option", { name: "Supervisor notified (pending contact)" }).click();
  await form.getByRole("button", { name: "Save triage" }).click();
  await expect(form).toBeHidden();

  const [stored] = await db
    .select({ hubId: triageEvent.hubId })
    .from(triageEvent)
    .where(
      and(
        eq(triageEvent.studentId, borrowed.studentId),
        eq(triageEvent.sessionId, borrowed.sessionId),
      ),
    );
  expect(stored?.hubId).toBe(borrowed.schoolHubId);
});
