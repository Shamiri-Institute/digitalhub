import type { Page } from "@playwright/test";
import { eq, inArray, sql } from "drizzle-orm";

import { db } from "#/db/client";
import { student, supervisor, triageEvent, triageEventAudit, user } from "#/db/schema";
import { objectId } from "#/lib/crypto";
import { sessionDisplayName } from "#/lib/utils";
import { expect, test, type Undo } from "#/tests/fixtures";
import { expectOpenUntilWritten, signableMember, signInWithEmail, required } from "#/tests/helpers";
import { chooseRowAction, getUrl, rowWithCell } from "#/tests/pages/helpers";

type Fixture = {
  fellowEmail: string;
  visibleId: string;
  sessionId: string;
  sessionLabel: string;
  studentId: string;
  studentName: string;
  admissionNumber: string;
  supervisorEmail: string;
  supervisorName: string;
};

// A fellow's student with no triage events and no clinical case, at an occurred session, and a
// supervisor in the session's hub who does not supervise the fellow, so the student appears on that
// supervisor's triage page only through a referral. Ordered from the other end to
// hub-scoped-writes.spec.ts, which triages at the first such session.
async function pickReferral() {
  const {
    rows: [row],
  } = await db.execute<Fixture>(sql`
    select u.email as "fellowEmail", s.visible_id as "visibleId", i.id as "sessionId",
      sn.session_name as "sessionLabel", st.id as "studentId", st.student_name as "studentName",
      st.admission_number as "admissionNumber", su.email as "supervisorEmail",
      sv.supervisor_name as "supervisorName"
    from intervention_groups g
    join fellows f on f.id = g.leader_id
    join implementer_members m on m.identifier = f.id and m.role = 'FELLOW'
    join users u on u.id = m.user_id
    join schools s on s.id = g.school_id
    join intervention_sessions i on i.school_id = s.id and i.occurred and i.session_date < now()
      and coalesce(i.status::text, '') <> 'Cancelled'
    join session_names sn on sn.id = i.session_id
    join students st on st.assigned_group_id = g.id and st.archived_at is null
      and coalesce(st.dropped_out, false) = false
      and st.admission_number is not null and st.student_name is not null
    join supervisors sv on sv.hub_id = i.hub_id and sv.id is distinct from f.supervisor_id
      and sv.supervisor_name is not null
    join implementer_members sm on sm.identifier = sv.id and sm.role = 'SUPERVISOR'
      and ${signableMember("sm")}
    join users su on su.id = sm.user_id
    where ${signableMember()}
      and not exists (select 1 from triage_events t where t.student_id = st.id)
      and not exists (select 1 from clinical_screening_info c where c.student_id = st.id)
      and (select count(*) from supervisors o
        where o.hub_id = sv.hub_id and o.supervisor_name = sv.supervisor_name) = 1
      and (select count(*) from students o
        where o.assigned_group_id = g.id and o.admission_number = st.admission_number) = 1
    order by u.email desc, i.session_date desc, st.id desc, sv.id
    limit 1`);
  return row && { ...row, sessionLabel: sessionDisplayName(row.sessionLabel) ?? row.sessionLabel };
}

test("changing a referral to peer counselling takes it off the supervisor's queue", async ({
  page,
  context,
  undo,
}) => {
  test.slow();
  const fixture = await pickReferral();
  required(fixture, "a fellow's untriaged student and another supervisor in the hub");
  undo(async () => {
    const events = await db
      .select({ id: triageEvent.id })
      .from(triageEvent)
      .where(eq(triageEvent.studentId, fixture.studentId));
    for (const { id } of events) {
      await db.delete(triageEventAudit).where(eq(triageEventAudit.triageEventId, id));
      await db.delete(triageEvent).where(eq(triageEvent.id, id));
    }
  });

  const form = page.getByRole("dialog", { name: "Document triage" });
  const action = form.getByRole("combobox", { name: "Action taken (required)" });
  const { visibleId, sessionLabel, admissionNumber } = fixture;
  async function chooseTriageAction(menuItem: string) {
    await page.goto(getUrl(`/fel/schools/${visibleId}/sessions`));
    await chooseRowAction(
      page,
      await rowWithCell(page, page.getByRole("main"), sessionLabel),
      "Mark student attendance",
    );
    const attendance = page.getByRole("dialog", { name: "Mark student attendance" });
    await chooseRowAction(page, await rowWithCell(page, attendance, admissionNumber), menuItem);
  }
  async function chooseAction(name: string) {
    await action.click();
    await page.getByRole("option", { name }).click();
  }

  await signInWithEmail(context, fixture.fellowEmail);
  await chooseTriageAction("Triage occurred");
  await form.getByRole("combobox", { name: "Risk screen outcome (required)" }).click();
  await page.getByRole("option", { name: "All NO (Risk negative)" }).click();
  await chooseAction("Referred to supervisor (risk-negative)");
  await form.getByRole("combobox", { name: "Supervisor (in the session hub)" }).click();
  await page.getByRole("option", { name: fixture.supervisorName, exact: true }).click();
  await form.getByRole("combobox", { name: "Supervisor handoff status (required)" }).click();
  await page.getByRole("option", { name: "Warm handoff completed (same day)" }).click();
  await form.getByRole("button", { name: "Save triage" }).click();
  await expect(form).toBeHidden();

  await signInWithEmail(context, fixture.supervisorEmail);
  const requiresAction = page.locator("div.space-y-3", {
    has: page.getByRole("heading", { name: "Requires my action" }),
  });
  const studentCell = requiresAction.getByRole("cell", {
    name: fixture.studentName.toLowerCase(),
    exact: true,
  });
  await page.goto(getUrl("/sc/triage"));
  await expect(studentCell).toBeVisible();

  await signInWithEmail(context, fixture.fellowEmail);
  await chooseTriageAction("Edit triage");
  await chooseAction("Provided peer counselling");
  await chooseAction("Referred to supervisor (risk-negative)");
  // Switching away from a referral clears the supervisor it named.
  await expect(form.getByRole("combobox", { name: "Supervisor (in the session hub)" })).toHaveText(
    "Select supervisor",
  );
  await chooseAction("Provided peer counselling");
  await form.getByRole("button", { name: "Save triage" }).click();
  await expect(form).toBeHidden();

  await signInWithEmail(context, fixture.supervisorEmail);
  await page.goto(getUrl("/sc/triage"));
  // The section renders with its rows, so once its heading shows, a missing row is a missing event.
  await expect(requiresAction.getByRole("heading", { name: "Requires my action" })).toBeVisible();
  await expect(studentCell).toHaveCount(0);
});

type RerouteFixture = {
  fellowEmail: string;
  fellowId: string;
  visibleId: string;
  schoolId: string;
  groupId: string;
  sessionId: string;
  sessionLabel: string;
  hubId: string;
  reviewerId: string;
  reviewerName: string;
  reviewerEmail: string;
  supervisorId: string;
  supervisorEmail: string;
  supervisorName: string;
  clinicalLeadEmail: string;
};

// A fellow's group at a school with an occurred session, two supervisors in the session's hub (one
// a referral is first routed to and one it is routed to next) and the hub's clinical lead. Ordered
// from the other end to hub-scoped-writes.spec.ts, like pickReferral.
async function pickReroute() {
  const {
    rows: [row],
  } = await db.execute<RerouteFixture>(sql`
    select u.email as "fellowEmail", f.id as "fellowId", s.visible_id as "visibleId",
      s.id as "schoolId", g.id as "groupId", i.id as "sessionId",
      sn.session_name as "sessionLabel", i.hub_id as "hubId", a.id as "reviewerId",
      a.supervisor_name as "reviewerName", au.email as "reviewerEmail", b.id as "supervisorId",
      bu.email as "supervisorEmail", b.supervisor_name as "supervisorName",
      lu.email as "clinicalLeadEmail"
    from intervention_groups g
    join fellows f on f.id = g.leader_id
    join implementer_members m on m.identifier = f.id and m.role = 'FELLOW'
    join users u on u.id = m.user_id
    join schools s on s.id = g.school_id
    join intervention_sessions i on i.school_id = s.id and i.occurred and i.session_date < now()
      and coalesce(i.status::text, '') <> 'Cancelled'
    join session_names sn on sn.id = i.session_id
    join supervisors a on a.hub_id = i.hub_id and a.supervisor_name is not null
    join implementer_members am on am.identifier = a.id and am.role = 'SUPERVISOR'
      and ${signableMember("am")}
    join users au on au.id = am.user_id
    join supervisors b on b.hub_id = i.hub_id and b.id <> a.id and b.supervisor_name is not null
    join implementer_members bm on bm.identifier = b.id and bm.role = 'SUPERVISOR'
      and ${signableMember("bm")}
    join users bu on bu.id = bm.user_id
    join clinical_leads cl on cl.assigned_hub_id = i.hub_id
    join implementer_members lm on lm.identifier = cl.id and lm.role = 'CLINICAL_LEAD'
      and ${signableMember("lm")}
    join users lu on lu.id = lm.user_id
    where ${signableMember()} and g.archived_at is null
      and (select count(*) from supervisors o
        where o.hub_id = b.hub_id and o.supervisor_name in (a.supervisor_name, b.supervisor_name)) = 2
      and (select count(*) from intervention_sessions o
        join session_names on session_names.id = o.session_id
        where o.school_id = s.id and session_names.session_name = sn.session_name) = 1
    order by u.email desc, i.session_date desc, a.id, b.id, lu.email
    limit 1`);
  return row && { ...row, sessionLabel: sessionDisplayName(row.sessionLabel) ?? row.sessionLabel };
}

/**
 * A new student in the fixture fellow's group with a triage event referring them to the first
 * supervisor, and the removal of both queued.
 */
async function seedReferral(
  fixture: RerouteFixture,
  undo: Undo,
  review?: { reviewNote: string; reviewedById: string },
) {
  const studentId = objectId("stu");
  const studentName = `e2e rerouted student ${Date.now()}`;
  const admissionNumber = String(Date.now()).slice(-9);
  await db.insert(student).values({
    id: studentId,
    visibleId: objectId("stu"),
    studentName,
    schoolId: fixture.schoolId,
    assignedGroupId: fixture.groupId,
    admissionNumber,
  });
  const triageEventId = objectId("triage");
  await db.insert(triageEvent).values({
    id: triageEventId,
    sessionId: fixture.sessionId,
    studentId,
    fellowId: fixture.fellowId,
    hubId: fixture.hubId,
    triageOccurred: true,
    riskScreenOutcome: "ALL_NO",
    actionTaken: "REFERRED",
    referredSupervisorId: fixture.reviewerId,
    supervisorHandoffStatus: "WARM_HANDOFF",
    ...(review && { reviewedAt: new Date(), ...review }),
  });
  // A test that fails mid-write leaves the write to land after it; locking the event first waits
  // for that write and the audit row it adds.
  undo(() =>
    db.transaction(async (tx) => {
      await tx
        .select({ id: triageEvent.id })
        .from(triageEvent)
        .where(eq(triageEvent.id, triageEventId))
        .for("update");
      await tx.delete(triageEventAudit).where(eq(triageEventAudit.triageEventId, triageEventId));
      await tx.delete(triageEvent).where(eq(triageEvent.id, triageEventId));
      await tx.delete(student).where(eq(student.id, studentId));
    }),
  );
  return { studentName, admissionNumber, triageEventId };
}

function requiresActionSection(page: Page) {
  return page.locator("div.space-y-3", {
    has: page.getByRole("heading", { name: "Requires my action" }),
  });
}

test("a reviewed referral routed to another supervisor waits for their action", async ({
  page,
  context,
  undo,
}) => {
  test.slow();
  const fixture = await pickReroute();
  required(fixture, "a fellow's group with an occurred session, two supervisors and a lead");
  // The seeded supervisors' users have no names, so the review comes from a named user.
  const reviewer = { id: objectId("user"), name: `E2E reviewer ${Date.now()}` };
  await db.insert(user).values(reviewer);
  undo(() => db.delete(user).where(eq(user.id, reviewer.id)));
  const reviewNote = `Spoke with the student ${Date.now()}`;
  const { studentName, admissionNumber } = await seedReferral(fixture, undo, {
    reviewNote,
    reviewedById: reviewer.id,
  });

  await signInWithEmail(context, fixture.fellowEmail);
  await page.goto(getUrl(`/fel/schools/${fixture.visibleId}/sessions`));
  await chooseRowAction(
    page,
    await rowWithCell(page, page.getByRole("main"), fixture.sessionLabel),
    "Mark student attendance",
  );
  const attendance = page.getByRole("dialog", { name: "Mark student attendance" });
  await chooseRowAction(page, await rowWithCell(page, attendance, admissionNumber), "Edit triage");
  const form = page.getByRole("dialog", { name: "Document triage" });
  await form.getByRole("combobox", { name: "Supervisor (in the session hub)" }).click();
  await page.getByRole("option", { name: fixture.supervisorName, exact: true }).click();
  await form.getByRole("button", { name: "Save triage" }).click();
  await expect(form).toBeHidden();

  await signInWithEmail(context, fixture.supervisorEmail);
  await page.goto(getUrl("/sc/triage"));
  await expect(
    requiresActionSection(page).getByRole("cell", { name: studentName, exact: true }),
  ).toBeVisible();

  // The edit's audit row keeps the review it cleared, and names the people involved.
  await signInWithEmail(context, fixture.clinicalLeadEmail);
  await page.goto(getUrl("/cl/triage/audits"));
  const edit = page.getByRole("row").filter({ hasText: reviewNote });
  await expect(edit).toContainText(
    `Referred supervisor: ${fixture.reviewerName}→${fixture.supervisorName}`,
  );
  await expect(edit).toContainText(`Reviewed by: ${reviewer.name}→—`);
  await expect(edit).toContainText(`Review note: ${reviewNote}→—`);
  await expect(edit).toContainText("Reviewed on: ");
  await expect(edit).not.toContainText("reviewedAt");
  // Fields the edit left empty are not listed as changes.
  await expect(edit).not.toContainText("—→—");
});

test("a review written while the fellow routes the referral elsewhere is refused", async ({
  page,
  context,
  undo,
}) => {
  test.slow();
  const fixture = await pickReroute();
  required(fixture, "a fellow's group with an occurred session, two supervisors and a lead");
  const { studentName, triageEventId } = await seedReferral(fixture, undo);

  await signInWithEmail(context, fixture.reviewerEmail);
  await page.goto(getUrl("/sc/triage"));
  const studentCell = requiresActionSection(page).getByRole("cell", {
    name: studentName,
    exact: true,
  });
  await chooseRowAction(
    page,
    await rowWithCell(page, requiresActionSection(page), studentName),
    "Mark reviewed",
  );
  const review = page.getByRole("dialog", { name: "Mark reviewed — no clinical case needed" });
  await review.getByRole("textbox").fill("Assessed the student");
  // The fellow routes the referral to the other supervisor while the review is being written.
  await db
    .update(triageEvent)
    .set({ referredSupervisorId: fixture.supervisorId })
    .where(eq(triageEvent.id, triageEventId));
  await review.getByRole("button", { name: "Confirm review" }).click();

  await expect(page.getByText("no longer yours to review").first()).toBeVisible();
  await expect(requiresActionSection(page).getByRole("heading")).toBeVisible();
  await expect(studentCell).toHaveCount(0);

  await signInWithEmail(context, fixture.supervisorEmail);
  await page.goto(getUrl("/sc/triage"));
  await expect(studentCell).toBeVisible();
});

test("the audit trail lists a re-route between two supervisors with the same name", async ({
  page,
  context,
  undo,
}) => {
  const fixture = await pickReroute();
  required(fixture, "a fellow's group with an occurred session, two supervisors and a lead");
  const { triageEventId } = await seedReferral(fixture, undo);
  const fixtureHub = await db.query.hub.findFirst({
    where: (h, { eq }) => eq(h.id, fixture.hubId),
    columns: { implementerId: true },
  });
  required(fixtureHub, "the fixture's hub");
  const sharedName = `E2E namesake supervisor ${Date.now()}`;
  const namesakes = [objectId("sup"), objectId("sup")].map((id) => ({
    id,
    supervisorName: sharedName,
    hubId: fixture.hubId,
    implementerId: fixtureHub.implementerId,
  }));
  await db.insert(supervisor).values(namesakes);
  undo(() =>
    db.delete(supervisor).where(
      inArray(
        supervisor.id,
        namesakes.map(({ id }) => id),
      ),
    ),
  );
  // An edit that routed the referral from one namesake to the other, as the edit form records it.
  const editor = { id: objectId("user"), name: `E2E namesake editor ${Date.now()}` };
  await db.insert(user).values(editor);
  undo(() => db.delete(user).where(eq(user.id, editor.id)));
  const [from, to] = namesakes;
  await db.insert(triageEventAudit).values({
    triageEventId,
    editedById: editor.id,
    beforeData: { referredSupervisorId: from?.id },
    afterData: { referredSupervisorId: to?.id },
  });

  await signInWithEmail(context, fixture.clinicalLeadEmail);
  await page.goto(getUrl("/cl/triage/audits"));
  await expect(page.getByRole("row").filter({ hasText: editor.name })).toContainText(
    `Referred supervisor: ${sharedName}→${sharedName}`,
  );
});

test("the review dialog stays open until the review is saved", async ({ page, context, undo }) => {
  test.slow();
  const fixture = await pickReroute();
  required(fixture, "a fellow's group with an occurred session, two supervisors and a lead");
  const { studentName, triageEventId } = await seedReferral(fixture, undo);

  await signInWithEmail(context, fixture.reviewerEmail);
  await page.goto(getUrl("/sc/triage"));
  await chooseRowAction(
    page,
    await rowWithCell(page, requiresActionSection(page), studentName),
    "Mark reviewed",
  );
  const review = page.getByRole("dialog", { name: "Mark reviewed — no clinical case needed" });
  await review.getByRole("textbox").fill("Assessed the student");
  await expectOpenUntilWritten(
    page,
    review,
    review.getByRole("button", { name: "Confirm review" }),
    {
      table: "triage_events",
      id: triageEventId,
    },
  );

  await page.reload();
  await expect(
    requiresActionSection(page).getByRole("cell", { name: studentName, exact: true }),
  ).toHaveCount(0);
});
