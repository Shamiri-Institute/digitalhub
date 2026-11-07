import { eq, sql } from "drizzle-orm";

import { db } from "#/db/client";
import { triageEvent, triageEventAudit } from "#/db/schema";
import { sessionDisplayName } from "#/lib/utils";
import { expect, test } from "#/tests/fixtures";
import { signableMember, signInWithEmail, required } from "#/tests/helpers";
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
