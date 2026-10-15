import type { Locator, Page } from "@playwright/test";
import { expect, test } from "#/tests/fixtures";
import { format } from "date-fns";
import { and, asc, eq, inArray, sql } from "drizzle-orm";

import { db } from "#/db/client";
import {
  interventionSession,
  student,
  studentAttendance,
  triageEvent,
  triageEventAudit,
} from "#/db/schema";
import { signableMember, signInWithEmail } from "#/tests/helpers";
import { chooseRowAction, getUrl, rowWithCell } from "#/tests/pages/helpers";
import { sessionDisplayName } from "#/lib/utils";

test.describe.configure({ mode: "serial" });

type Coordinator = { email: string; hubId: string; implementerId: string };
type SchoolFixture = {
  visibleId: string;
  schoolName: string;
  studentId: string;
  studentName: string;
  sessionId: string;
  sessionLabel: string;
  sessionOccurred: boolean;
  groupName: string;
  /** A supervisor in the coordinator's hub. */
  supervisorEmail: string;
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

test.beforeAll(async () => {
  const { rows: coordinators } = await db.execute<Coordinator>(sql`
    select u.email, h.assigned_hub_id as "hubId", h.implementer_id as "implementerId"
    from hub_coordinators h
    join implementer_members m on m.identifier = h.id and m.role = 'HUB_COORDINATOR'
    join users u on u.id = m.user_id and u.email is not null
    where h.assigned_hub_id is not null and ${signableMember()}
    order by u.email`);

  for (const candidate of coordinators) {
    // Same organisation, different hub: the case a hub check exists for.
    const other = coordinators.find(
      (c) => c.implementerId === candidate.implementerId && c.hubId !== candidate.hubId,
    );
    const {
      rows: [supervisorRow],
    } = await db.execute<{ email: string }>(sql`
      select u.email from supervisors sup
      join implementer_members m on m.identifier = sup.id and m.role = 'SUPERVISOR'
      join users u on u.id = m.user_id and u.email is not null
      where sup.hub_id = ${candidate.hubId} and ${signableMember()}
      order by u.email
      limit 1`);
    if (!other || !supervisorRow) continue;
    const {
      rows: [row],
    } = await db.execute<Omit<SchoolFixture, "supervisorEmail">>(sql`
      select s.visible_id as "visibleId", s.school_name as "schoolName",
        st.id as "studentId", st.student_name as "studentName",
        i.id as "sessionId", sn.session_name as "sessionLabel", i.occurred as "sessionOccurred",
        g.group_name as "groupName"
      from schools s
      join students st on st.school_id = s.id and st.archived_at is null
        and coalesce(st.dropped_out, false) = false and st.student_name is not null
      join intervention_groups g on g.id = st.assigned_group_id
      join intervention_sessions i on i.school_id = s.id and i.occurred
        and i.session_date < now() and coalesce(i.status::text, '') <> 'Cancelled'
      join session_names sn on sn.id = i.session_id
      where s.hub_id = ${candidate.hubId} and s.archived_at is null
        and coalesce(s.dropped_out, false) = false
      order by s.visible_id, st.id, i.session_date
      limit 1`);
    if (row) {
      coordinator = candidate;
      otherCoordinator = other;
      school = {
        ...row,
        sessionLabel: sessionDisplayName(row.sessionLabel) ?? row.sessionLabel,
        supervisorEmail: supervisorRow.email,
      };
      break;
    }
  }
  if (!school) {
    throw new Error(
      "seed the database first: no coordinator with a school that has grouped students, an occurred " +
        "session and a supervisor, and another coordinator in the same organisation",
    );
  }
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
      and ${signableMember("other_member")}
    join users other_user on other_user.id = other_member.user_id and other_user.email is not null
    join students other_student on other_student.assigned_group_id = other_group.id
      and other_student.archived_at is null and other_student.admission_number is not null
    where ${signableMember()} and m.implementer_id = ${coordinator.implementerId}
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

async function openStudentAttendance(page: Page) {
  await page.goto(getUrl(`/fel/schools/${triage.visibleId}/sessions`));
  await chooseRowAction(
    page,
    await sessionRow(page, page.getByRole("main"), triage.sessionLabel),
    "Mark student attendance",
  );
  const attendance = page.getByRole("dialog", { name: "Mark student attendance" });
  // The student list loads after the dialog opens; search only once it has rows.
  await expect(attendance.getByRole("checkbox", { name: "Select row" }).first()).toBeVisible();
  return attendance;
}

test("a hub coordinator drops out a student in their hub", async ({ page, context, undo }) => {
  await signInWithEmail(context, coordinator.email);
  const studentsPage = getUrl(`/hc/schools/${school.visibleId}/students`);
  await page.goto(studentsPage);
  undo(() =>
    db
      .update(student)
      .set({ droppedOut: false, dropOutReason: null, droppedOutAt: null })
      .where(eq(student.id, school.studentId)),
  );

  const main = page.getByRole("main");
  await chooseRowAction(
    page,
    await rowWithCell(page, main, school.studentName),
    "Drop-out student",
  );
  const dialog = page.getByRole("dialog", { name: "Drop out student" });
  await dialog.getByRole("combobox", { name: "Select reason *" }).click();
  await page.getByRole("option").first().click();
  await dialog.getByRole("button", { name: "Submit" }).click();
  const confirm = page.getByRole("dialog", { name: "Confirm drop out" });
  await confirm.getByRole("button", { name: "Confirm" }).click();
  await expect(confirm).toBeHidden();

  await page.reload();
  await expect(await rowWithCell(page, main, school.studentName)).toContainText("Inactive");
});

test("a hub coordinator marks a session in their hub as occurred", async ({
  page,
  context,
  undo,
}) => {
  await db
    .update(interventionSession)
    .set({ occurred: false })
    .where(eq(interventionSession.id, school.sessionId));
  undo(() =>
    db
      .update(interventionSession)
      .set({ occurred: school.sessionOccurred })
      .where(eq(interventionSession.id, school.sessionId)),
  );
  await signInWithEmail(context, coordinator.email);
  await page.goto(getUrl(`/hc/schools/${school.visibleId}/sessions`));

  const main = page.getByRole("main");
  await chooseRowAction(
    page,
    await sessionRow(page, main, school.sessionLabel),
    "Mark session occurrence",
  );
  const dialog = page.getByRole("dialog", { name: "Mark session occurrence" });
  await dialog.getByRole("radio", { name: "Attended" }).click();
  await dialog.getByRole("button", { name: "Submit" }).click();
  // Submit only opens a confirmation; Confirm saves.
  const confirm = page
    .getByRole("dialog", { name: "Mark session occurrence" })
    .filter({ hasText: "Are you sure?" });
  await confirm.getByRole("button", { name: "Confirm" }).click();
  await expect(confirm).toBeHidden();

  await page.reload();
  await expect(await sessionRow(page, main, school.sessionLabel)).toContainText("Attended");
});

test("a hub coordinator in another hub does not see the school", async ({ page, context }) => {
  await signInWithEmail(context, otherCoordinator.email);
  await page.goto(getUrl("/hc/schools"));

  const main = page.getByRole("main");
  await expect(await rowWithCell(page, main, school.schoolName)).toHaveCount(0);

  await page.goto(getUrl(`/hc/schools/${school.visibleId}/students`));
  await expect(page.getByText("This page could not be found.")).toBeVisible();
});

test("a hub coordinator marks a student in their hub missed at a session", async ({
  page,
  context,
  undo,
}) => {
  const attendanceAtSession = and(
    eq(studentAttendance.studentId, school.studentId),
    eq(studentAttendance.sessionId, school.sessionId),
  );
  const originalAttendances = await db.select().from(studentAttendance).where(attendanceAtSession);
  await db.delete(studentAttendance).where(attendanceAtSession);
  undo(async () => {
    await db.delete(studentAttendance).where(attendanceAtSession);
    if (originalAttendances.length > 0) {
      await db.insert(studentAttendance).values(originalAttendances);
    }
  });
  const session = await db.query.interventionSession.findFirst({
    where: (s, { eq }) => eq(s.id, school.sessionId),
    columns: { sessionDate: true },
  });
  if (!session) throw new Error(`session ${school.sessionId} is gone`);
  await signInWithEmail(context, coordinator.email);
  await page.goto(getUrl(`/hc/schools/${school.visibleId}/students`));

  const main = page.getByRole("main");
  await chooseRowAction(
    page,
    await rowWithCell(page, main, school.studentName),
    "Mark student attendance",
  );
  const mark = page.getByRole("dialog").filter({ hasText: "Select attendance" });
  await mark.getByRole("combobox", { name: "Select session" }).click();
  await page
    .getByRole("option")
    .filter({ hasText: school.sessionLabel })
    .filter({ hasText: format(session.sessionDate, "dd MMM yyyy") })
    .click();
  await mark.getByRole("radio", { name: "Missed" }).click();
  await mark.getByRole("combobox", { name: "Select reason for above" }).click();
  await page.getByRole("option").first().click();
  await mark.getByRole("button", { name: "Submit" }).click();
  await expect(mark).toBeHidden();

  await page.reload();
  await chooseRowAction(
    page,
    await rowWithCell(page, main, school.studentName),
    "View attendance history",
  );
  const history = page.getByRole("dialog", { name: "Student session attendance history" });
  await expect(
    history
      .getByRole("row")
      .filter({ has: page.getByRole("cell", { name: school.sessionLabel, exact: true }) }),
  ).toContainText("Missed");
});

test("a supervisor edits the details of a student in their hub", async ({
  page,
  context,
  undo,
}) => {
  const [originalDetails] = await db
    .select({ studentName: student.studentName, form: student.form, stream: student.stream })
    .from(student)
    .where(eq(student.id, school.studentId));
  if (!originalDetails) throw new Error(`student ${school.studentId} is gone`);
  undo(() => db.update(student).set(originalDetails).where(eq(student.id, school.studentId)));
  await signInWithEmail(context, school.supervisorEmail);
  await page.goto(getUrl(`/sc/schools/${school.visibleId}/students`));

  const main = page.getByRole("main");
  await chooseRowAction(
    page,
    await rowWithCell(page, main, school.studentName),
    "Edit information",
  );
  const dialog = page.getByRole("dialog", { name: "Edit student information" });
  const nameInput = dialog.getByLabel("Student name");
  // The form loads the student after it opens; typing before that is overwritten.
  await expect(nameInput).toHaveValue(school.studentName);
  const editedName = `${school.studentName} Edited`;
  await nameInput.fill(editedName);
  // The seed leaves these required fields empty.
  await dialog.getByLabel("Grade/Form").fill("2");
  await dialog.getByLabel("Stream").fill("East");
  await dialog.getByRole("button", { name: "Update & save" }).click();
  await expect(dialog).toBeHidden();

  await page.reload();
  await expect(await rowWithCell(page, main, editedName)).toHaveCount(1);
});

test("a hub coordinator adds a student to a group in their hub", async ({
  page,
  context,
  undo,
}) => {
  const newStudentName = `E2E Student ${Date.now()}`;
  undo(() => db.delete(student).where(eq(student.studentName, newStudentName)));
  await signInWithEmail(context, coordinator.email);
  await page.goto(getUrl(`/hc/schools/${school.visibleId}/groups`));

  await chooseRowAction(
    page,
    await rowWithCell(page, page.getByRole("main"), school.groupName),
    "View students in group",
  );
  await page
    .getByRole("dialog", { name: "Students in group" })
    .getByRole("button", { name: "Add Student" })
    .click();
  const form = page.getByRole("dialog", { name: "Add student to group" });
  await form.getByLabel("Student name").fill(newStudentName);
  await form.getByRole("combobox", { name: /Gender/ }).click();
  await page.getByRole("option", { name: "Female" }).click();
  await form.getByLabel("Year of birth").fill("2012");
  // A new admission number, so the form does not offer to transfer an existing student.
  await form.getByLabel("Admission number").fill(String(Date.now()).slice(-9));
  await form.getByLabel("Grade/Form").fill("2");
  await form.getByLabel("Stream").fill("East");
  await form.getByRole("button", { name: "Submit" }).click();
  await expect(form).toBeHidden();

  await page.goto(getUrl(`/hc/schools/${school.visibleId}/students`));
  await expect(await rowWithCell(page, page.getByRole("main"), newStudentName)).toHaveCount(1);
});

test("a fellow marks one student missed and two students attended at once", async ({
  page,
  context,
  undo,
}) => {
  const groupStudents = await db
    .select({ id: student.id, admissionNumber: student.admissionNumber })
    .from(student)
    .where(
      and(
        eq(
          student.assignedGroupId,
          sql`(select assigned_group_id from students where id = ${triage.studentId})`,
        ),
        sql`${student.archivedAt} is null and ${student.admissionNumber} is not null`,
      ),
    )
    .orderBy(asc(student.id))
    .limit(3);
  const [missedStudent, ...attendedStudents] = groupStudents;
  if (!missedStudent || attendedStudents.length < 2) {
    throw new Error("seed the database first: the triage fellow's group has under 3 students");
  }
  const studentIds = groupStudents.map(({ id }) => id);
  const attendanceAtSession = and(
    eq(studentAttendance.sessionId, triage.sessionId),
    inArray(studentAttendance.studentId, studentIds),
  );
  const originalAttendances = await db.select().from(studentAttendance).where(attendanceAtSession);
  undo(async () => {
    await db.delete(studentAttendance).where(attendanceAtSession);
    if (originalAttendances.length > 0) {
      await db.insert(studentAttendance).values(originalAttendances);
    }
  });
  await signInWithEmail(context, triage.email);

  let attendance = await openStudentAttendance(page);
  await chooseRowAction(
    page,
    await rowWithCell(page, attendance, missedStudent.admissionNumber ?? ""),
    "Mark attendance",
  );
  const mark = page.getByRole("dialog").filter({ hasText: "Select attendance" });
  await mark.getByRole("radio", { name: "Missed" }).click();
  await mark.getByRole("combobox", { name: "Select reason for above" }).click();
  const absenceReason = (await page.getByRole("option").first().innerText()).trim();
  await page.getByRole("option").first().click();
  await mark.getByRole("button", { name: "Submit" }).click();
  await expect(mark).toBeHidden();

  attendance = await openStudentAttendance(page);
  for (const { admissionNumber } of attendedStudents) {
    const studentRow = await rowWithCell(page, attendance, admissionNumber ?? "");
    await studentRow.getByRole("checkbox", { name: "Select row" }).check();
  }
  await attendance.getByRole("button", { name: "Mark student attendance" }).click();
  await expect(mark).toContainText("2 students");
  await mark.getByRole("radio").first().click();
  await mark.getByRole("button", { name: "Submit" }).click();
  await expect(mark).toBeHidden();

  attendance = await openStudentAttendance(page);
  await expect(
    await rowWithCell(page, attendance, missedStudent.admissionNumber ?? ""),
  ).toContainText("Missed");
  for (const { admissionNumber } of attendedStudents) {
    await expect(await rowWithCell(page, attendance, admissionNumber ?? "")).toContainText(
      "Attended",
    );
  }

  // No page shows the absence reason; one row per student also rules out duplicate writes.
  const markedStudentAttendances = await db
    .select({
      studentId: studentAttendance.studentId,
      attended: studentAttendance.attended,
      absenceReason: studentAttendance.absenceReason,
    })
    .from(studentAttendance)
    .where(attendanceAtSession)
    .orderBy(asc(studentAttendance.studentId));
  expect(markedStudentAttendances).toEqual(
    [
      { studentId: missedStudent.id, attended: false, absenceReason },
      ...attendedStudents.map(({ id }) => ({ studentId: id, attended: true, absenceReason: null })),
    ].toSorted((a, b) => a.studentId.localeCompare(b.studentId)),
  );
});

test("a fellow documents a triage event; another fellow at the school does not see it", async ({
  page,
  context,
  undo,
}) => {
  test.slow();
  const note = `e2e-2212-${Date.now()}`;
  await signInWithEmail(context, triage.email);
  const openAttendance = () => openStudentAttendance(page);

  async function chooseStudentAction(action: string, admissionNumber = triage.admissionNumber) {
    const attendance = await openAttendance();
    // The name column is not searchable; the admission number column is.
    await chooseRowAction(page, await rowWithCell(page, attendance, admissionNumber), action);
  }

  const form = page.getByRole("dialog", { name: "Document triage" });
  async function documentTriage(admissionNumber: string) {
    await chooseStudentAction("Triage occurred", admissionNumber);
    await form.getByRole("combobox", { name: "Risk screen outcome (required)" }).click();
    await page.getByRole("option", { name: "All NO (Risk negative)" }).click();
    await form.getByRole("combobox", { name: "Action taken (required)" }).click();
    await page.getByRole("option", { name: "Provided peer counselling" }).click();
    await form.getByRole("button", { name: "Save triage" }).click();
    await expect(form).toBeHidden();
  }

  undo(async () => {
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

  await chooseStudentAction("Edit triage");
  const riskOutcome = form.getByRole("combobox", { name: "Risk screen outcome (required)" });
  await expect(riskOutcome).toContainText("All NO (Risk negative)");
  await riskOutcome.click();
  await page.getByRole("option", { name: "Any YES (Risk positive)" }).click();
  await expect(form.getByRole("combobox", { name: "Action taken (required)" })).toContainText(
    "Escalated immediately to supervisor (risk-positive)",
  );
  await riskOutcome.click();
  await page.getByRole("option", { name: "All NO (Risk negative)" }).click();
  await form.getByRole("combobox", { name: "Action taken (required)" }).click();
  await page.getByRole("option", { name: "Provided peer counselling" }).click();
  await form.getByRole("textbox", { name: /Short note/ }).fill(note);
  await form.getByRole("button", { name: "Save triage" }).click();
  await expect(form).toBeHidden();

  await chooseStudentAction("View triage");
  const view = page.getByRole("dialog", { name: "View triage" });
  await expect(view.getByRole("textbox", { name: /Short note/ })).toHaveValue(note);

  await signInWithEmail(context, triage.otherFellowEmail);
  await documentTriage(triage.otherAdmissionNumber);
  const otherAttendance = await openAttendance();
  await expect(otherAttendance.getByText("1 student triaged", { exact: true })).toBeVisible();
});
