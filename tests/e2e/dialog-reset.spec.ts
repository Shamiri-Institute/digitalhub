import type { Locator, Page } from "@playwright/test";
import { format } from "date-fns";
import { eq, sql } from "drizzle-orm";

import { db } from "#/db/client";
import { monthlySupervisorEvaluation, weeklyFellowRatings } from "#/db/schema";
import { sessionDisplayName } from "#/lib/utils";
import { expect, test } from "#/tests/fixtures";
import { signableMember, signInWithEmail, uniqueFellowName } from "#/tests/helpers";
import { chooseRowAction, getUrl, rowWithCell, searchRows } from "#/tests/pages/helpers";

// Each test opens a dialog for one row, types without saving, closes it and opens it again, then
// opens it for a second row: the dialog must show each row's saved values, never the typed text.

const typed = `typed-${Date.now()}`;

async function closeDialog(page: Page, dialog: Locator) {
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
}

async function pickSupervisorWithTwoFellows() {
  const {
    rows: [row],
  } = await db.execute<{
    email: string;
    supervisorId: string;
    fellowIds: string[];
    fellowNames: string[];
  }>(sql`
    select u.email, sv.id as "supervisorId",
      (array_agg(f.id order by f.id))[1:2] as "fellowIds",
      (array_agg(f.fellow_name order by f.id))[1:2] as "fellowNames"
    from implementer_members m
    join users u on u.id = m.user_id and u.email is not null
    join supervisors sv on sv.id = m.identifier
    join fellows f on f.supervisor_id = sv.id and f.fellow_name is not null
      and coalesce(f.dropped_out, false) = false
    where m.role = 'SUPERVISOR' and ${signableMember()} and ${uniqueFellowName()}
    group by u.email, sv.id
    having count(*) >= 2
    order by u.email
    limit 1`);
  if (!row) throw new Error("seed the database first: no supervisor with two fellows");
  return row;
}

test("weekly fellow evaluation shows each fellow's saved notes, not typed text", async ({
  page,
  context,
  undo,
}) => {
  const supervisor = await pickSupervisorWithTwoFellows();
  const [fellowA = ""] = supervisor.fellowIds;
  const [nameA = "", nameB = ""] = supervisor.fellowNames;
  const savedNotes = `saved notes ${Date.now()}`;
  const [rating] = await db
    .insert(weeklyFellowRatings)
    .values({
      fellowId: fellowA,
      supervisorId: supervisor.supervisorId,
      week: new Date(),
      behaviourNotes: savedNotes,
      programDeliveryNotes: "",
      dressingAndGroomingNotes: "",
      punctualityNotes: "",
    })
    .returning({ id: weeklyFellowRatings.id });
  if (!rating) throw new Error("could not insert the weekly fellow rating fixture");
  undo(() => db.delete(weeklyFellowRatings).where(eq(weeklyFellowRatings.id, rating.id)));

  await signInWithEmail(context, supervisor.email);
  await page.goto(getUrl("/sc/fellows"));
  const dialog = page.getByRole("dialog", { name: "Weekly fellow evaluation" });
  const behaviourNotes = dialog.getByRole("textbox").first();
  async function openFor(name: string) {
    await chooseRowAction(page, await searchRows(page, name), "Submit weekly fellow evaluation");
    await expect(dialog).toBeVisible();
  }

  await openFor(nameA);
  await expect(behaviourNotes).toHaveValue(savedNotes);
  await behaviourNotes.fill(typed);
  await closeDialog(page, dialog);

  await openFor(nameA);
  await expect(behaviourNotes).toHaveValue(savedNotes);
  await closeDialog(page, dialog);

  await openFor(nameB);
  await expect(behaviourNotes).toHaveValue("");
});

test("student group evaluation shows the chosen session's saved comment, not typed text", async ({
  page,
  context,
}) => {
  const {
    rows: [fixture],
  } = await db.execute<{
    email: string;
    schoolVisibleId: string;
    groupName: string;
    latestComment: string;
    olderComment: string;
    olderSessionDate: string;
  }>(sql`
    with reports as (
      select r.group_id, r.engagement_comment, s.session_date,
        row_number() over (partition by r.group_id order by s.session_date desc) as rank
      from intervention_group_reports r
      join intervention_sessions s on s.id = r.intervention_session_id and s.occurred
      where r.engagement_comment <> ''
    )
    select u.email, sc.visible_id as "schoolVisibleId", g.group_name as "groupName",
      latest.engagement_comment as "latestComment", older.engagement_comment as "olderComment",
      older.session_date::text as "olderSessionDate"
    from implementer_members m
    join users u on u.id = m.user_id and u.email is not null
    join intervention_groups g on g.leader_id = m.identifier and g.archived_at is null
      and g.group_name is not null
    join schools sc on sc.id = g.school_id
    join reports latest on latest.group_id = g.id and latest.rank = 1
    join reports older on older.group_id = g.id and older.rank = 2
      and older.engagement_comment <> latest.engagement_comment
    where m.role = 'FELLOW' and ${signableMember()}
      and (select count(*) from intervention_groups o
        where o.school_id = g.school_id and o.group_name = g.group_name) = 1
    order by u.email, g.id
    limit 1`);
  if (!fixture) throw new Error("seed the database first: no fellow's group with two reports");

  await signInWithEmail(context, fixture.email);
  await page.goto(getUrl(`/fel/schools/${fixture.schoolVisibleId}/group`));
  const dialog = page.getByRole("dialog", { name: "Student group evaluation" });
  const engagementComment = dialog.getByRole("textbox").first();
  async function open() {
    await chooseRowAction(
      page,
      await rowWithCell(page, page.getByRole("main"), fixture?.groupName ?? ""),
      "View student group evaluation",
    );
    await expect(dialog).toBeVisible();
  }

  await open();
  await expect(engagementComment).toHaveValue(fixture.latestComment);
  await dialog.getByRole("combobox", { name: /^Select session/ }).click();
  await page
    .getByRole("option")
    .filter({ hasText: format(new Date(fixture.olderSessionDate), "dd MMM yyyy") })
    .click();
  await expect(engagementComment).toHaveValue(fixture.olderComment);
  await engagementComment.fill(typed);
  await closeDialog(page, dialog);

  await open();
  await expect(engagementComment).not.toHaveValue(typed);
});

test("monthly supervisor evaluation clears the chosen month and comments when reopened", async ({
  page,
  context,
  undo,
}) => {
  const {
    rows: [fixture],
  } = await db.execute<{
    email: string;
    coordinatorId: string;
    projectId: string;
    month: string;
    monthLabel: string;
    supervisorIds: string[];
    supervisorNames: string[];
  }>(sql`
    select u.email, hc.id as "coordinatorId", p.id as "projectId",
      date_trunc('month', p.actual_start_date)::date::text as month,
      to_char(date_trunc('month', p.actual_start_date), 'Mon YYYY') as "monthLabel",
      (array_agg(sv.id order by sv.id))[1:2] as "supervisorIds",
      (array_agg(sv.supervisor_name order by sv.id))[1:2] as "supervisorNames"
    from hub_coordinators hc
    join implementer_members m on m.identifier = hc.id and m.role = 'HUB_COORDINATOR'
    join users u on u.id = m.user_id and u.email is not null
    join hubs h on h.id = hc.assigned_hub_id
    join projects p on p.id = h.project_id and p.actual_start_date is not null
    join supervisors sv on sv.hub_id = h.id and sv.supervisor_name is not null
      and coalesce(sv.dropped_out, false) = false
      and (select count(*) from supervisors o
        where o.hub_id = sv.hub_id and o.supervisor_name = sv.supervisor_name) = 1
    where ${signableMember()}
    group by u.email, hc.id, p.id
    having count(*) >= 2
    order by u.email
    limit 1`);
  if (!fixture) throw new Error("seed the database first: no coordinator with two supervisors");
  const [supervisorA = ""] = fixture.supervisorIds;
  const [nameA = "", nameB = ""] = fixture.supervisorNames;
  const savedComment = `saved comment ${Date.now()}`;
  const [evaluation] = await db
    .insert(monthlySupervisorEvaluation)
    .values({
      projectId: fixture.projectId,
      supervisorId: supervisorA,
      hubCoordinatorId: fixture.coordinatorId,
      month: new Date(fixture.month),
      respectfulness: 3,
      attitude: 3,
      collaboration: 3,
      reliability: 3,
      identificationOfIssues: 3,
      leadership: 3,
      communicationStyle: 3,
      conflictResolution: 3,
      adaptability: 3,
      recognitionAndFeedback: 3,
      decisionMaking: 3,
      fellowRecruitmentEffectiveness: 3,
      fellowTrainingEffectiveness: 3,
      programLogisticsCoordination: 3,
      programSessionAttendance: 3,
      workplaceDemeanorComments: savedComment,
    })
    .returning({ id: monthlySupervisorEvaluation.id });
  if (!evaluation) throw new Error("could not insert the monthly evaluation fixture");
  undo(() =>
    db.delete(monthlySupervisorEvaluation).where(eq(monthlySupervisorEvaluation.id, evaluation.id)),
  );

  await signInWithEmail(context, fixture.email);
  await page.goto(getUrl("/hc/supervisors"));
  const dialog = page.getByRole("dialog").filter({ hasText: "Select month" });
  const month = dialog.getByRole("combobox", { name: /^Select month/ });
  const firstComment = dialog.getByRole("textbox").first();
  async function openFor(name: string) {
    await chooseRowAction(page, await searchRows(page, name), "Monthly supervisor evaluation");
    await expect(dialog).toBeVisible();
  }

  await openFor(nameA);
  await month.click();
  await page.getByRole("option", { name: new RegExp(`- ${fixture.monthLabel}$`) }).click();
  await expect(firstComment).toHaveValue(savedComment);
  await firstComment.fill(typed);
  await closeDialog(page, dialog);

  await openFor(nameA);
  await expect(month).toContainText("Select a month");
  await expect(firstComment).toHaveValue("");
  await closeDialog(page, dialog);

  await openFor(nameB);
  await expect(month).toContainText("Select a month");
  await expect(firstComment).toHaveValue("");
});

test("fellow drop-out clears the chosen reason when reopened and for another fellow", async ({
  page,
  context,
}) => {
  const {
    rows: [fixture],
  } = await db.execute<{ email: string; fellowNames: string[] }>(sql`
    select u.email, (array_agg(f.fellow_name order by f.id))[1:2] as "fellowNames"
    from hub_coordinators hc
    join implementer_members m on m.identifier = hc.id and m.role = 'HUB_COORDINATOR'
    join users u on u.id = m.user_id and u.email is not null
    join fellows f on f.hub_id = hc.assigned_hub_id and f.fellow_name is not null
      and coalesce(f.dropped_out, false) = false
    where ${signableMember()} and ${uniqueFellowName()}
    group by u.email
    having count(*) >= 2
    order by u.email
    limit 1`);
  const [nameA, nameB] = fixture?.fellowNames ?? [];
  if (!fixture || !nameA || !nameB) {
    throw new Error("seed the database first: no coordinator with two fellows");
  }

  await signInWithEmail(context, fixture.email);
  await page.goto(getUrl("/hc/fellows"));
  const dialog = page.getByRole("dialog").filter({ hasText: "Drop out fellow" });
  const reason = dialog.getByRole("combobox", { name: /^Select reason/ });
  async function openFor(name: string) {
    await chooseRowAction(page, await searchRows(page, name), "Drop-out fellow");
    await expect(dialog).toBeVisible();
  }

  await openFor(nameA);
  await expect(dialog).toContainText(nameA);
  await reason.click();
  await page.getByRole("option").first().click();
  await expect(reason).not.toContainText("Select a dropout reason");
  await closeDialog(page, dialog);

  await openFor(nameA);
  await expect(reason).toContainText("Select a dropout reason");
  await dialog.getByRole("button", { name: "Submit" }).click();
  await expect(dialog.getByText("Please select reason for drop out.")).toBeVisible();
  await closeDialog(page, dialog);

  await openFor(nameB);
  await expect(dialog).toContainText(nameB);
  await expect(reason).toContainText("Select a dropout reason");
});

test("fellow drop-out for a group leader goes through the replace step and cancelling discards it", async ({
  page,
  context,
}) => {
  const {
    rows: [fixture],
  } = await db.execute<{ email: string; fellowName: string }>(sql`
    select u.email, f.fellow_name as "fellowName"
    from hub_coordinators hc
    join implementer_members m on m.identifier = hc.id and m.role = 'HUB_COORDINATOR'
    join users u on u.id = m.user_id and u.email is not null
    join fellows f on f.hub_id = hc.assigned_hub_id and f.fellow_name is not null
      and coalesce(f.dropped_out, false) = false
    where ${signableMember()} and ${uniqueFellowName()}
      and exists (select 1 from intervention_groups g where g.leader_id = f.id and g.archived_at is null)
    order by u.email, f.id
    limit 1`);
  if (!fixture) throw new Error("seed the database first: no fellow who leads a group");

  await signInWithEmail(context, fixture.email);
  await page.goto(getUrl("/hc/fellows"));
  const dropout = page.getByRole("dialog").filter({ hasText: "Drop out fellow" });
  const reason = dropout.getByRole("combobox", { name: /^Select reason/ });
  async function open() {
    await chooseRowAction(
      page,
      await searchRows(page, fixture?.fellowName ?? ""),
      "Drop-out fellow",
    );
    await expect(dropout).toBeVisible();
  }

  await open();
  await reason.click();
  await page.getByRole("option").first().click();
  await dropout.getByRole("button", { name: "Submit" }).click();
  const confirm = page.getByRole("dialog").filter({ hasText: "Confirm drop out" });
  await confirm.getByRole("button", { name: "Confirm" }).click();
  const replace = page.getByRole("dialog").filter({ hasText: "Replace fellow" });
  await expect(replace.getByRole("button", { name: "Replace" }).first()).toBeVisible();
  await replace.getByRole("button", { name: "Cancel" }).click();
  await expect(replace).toBeHidden();

  await open();
  await expect(reason).toContainText("Select a dropout reason");
  await dropout.getByRole("button", { name: "Submit" }).click();
  await expect(dropout.getByText("Please select reason for drop out.")).toBeVisible();
});

test("school details show each school's saved name, not typed text", async ({ page, context }) => {
  const {
    rows: [fixture],
  } = await db.execute<{ email: string; schoolNames: string[] }>(sql`
    select u.email, (array_agg(s.school_name order by s.visible_id))[1:2] as "schoolNames"
    from hub_coordinators hc
    join implementer_members m on m.identifier = hc.id and m.role = 'HUB_COORDINATOR'
    join users u on u.id = m.user_id and u.email is not null
    join schools s on s.hub_id = hc.assigned_hub_id and s.archived_at is null
      and s.dropped_out_at is null
      and (select count(*) from schools o where o.school_name = s.school_name) = 1
    where ${signableMember()}
    group by u.email
    having count(*) >= 2
    order by u.email
    limit 1`);
  const [nameA, nameB] = fixture?.schoolNames ?? [];
  if (!fixture || !nameA || !nameB) {
    throw new Error("seed the database first: no coordinator with two schools");
  }

  await signInWithEmail(context, fixture.email);
  await page.goto(getUrl("/hc/schools"));
  const dialog = page.getByRole("dialog", { name: "Edit school information" });
  const schoolName = dialog.getByLabel("School name");
  async function openFor(name: string) {
    await chooseRowAction(
      page,
      await rowWithCell(page, page.getByRole("main"), name),
      "Edit school information",
    );
    await expect(dialog).toBeVisible();
  }

  await openFor(nameA);
  await expect(schoolName).toHaveValue(nameA);
  await schoolName.fill(typed);
  await closeDialog(page, dialog);

  await openFor(nameA);
  await expect(schoolName).toHaveValue(nameA);
  await closeDialog(page, dialog);

  await openFor(nameB);
  await expect(schoolName).toHaveValue(nameB);
});

test("weekly session report shows each session's saved highlights, not typed text", async ({
  page,
  context,
}) => {
  const { rows: sessions } = await db.execute<{
    email: string;
    schoolVisibleId: string;
    sessionLabel: string;
    highlights: string;
  }>(sql`
    with target as (
      select u.email, sv.id as supervisor_id, s.id as school_id, s.visible_id
      from intervention_session_ratings r
      join intervention_sessions i on i.id = r.session_id
      join schools s on s.id = i.school_id and s.archived_at is null
      join supervisors sv on sv.id = r.supervisor_id
      join implementer_members m on m.identifier = sv.id and m.role = 'SUPERVISOR'
      join users u on u.id = m.user_id and u.email is not null
      where ${signableMember()} and r.positive_highlights <> ''
        and s.assigned_supervisor_id = sv.id
      order by u.email, s.visible_id
      limit 1
    )
    select t.email, t.visible_id as "schoolVisibleId", n.session_name as "sessionLabel",
      coalesce(r.positive_highlights, '') as highlights
    from target t
    join intervention_sessions i on i.school_id = t.school_id and i.occurred
    join session_names n on n.id = i.session_id
    left join intervention_session_ratings r on r.session_id = i.id and r.supervisor_id = t.supervisor_id
    where (select count(*) from intervention_sessions o
      where o.school_id = i.school_id and o.session_id = i.session_id) = 1
    order by r.id is null, i.session_date
    limit 2`);
  const [sessionA, sessionB] = sessions;
  if (!sessionA?.highlights || !sessionB) {
    throw new Error("seed the database first: no supervisor with a rated session");
  }

  await signInWithEmail(context, sessionA.email);
  await page.goto(getUrl(`/sc/schools/${sessionA.schoolVisibleId}/sessions`));
  const main = page.getByRole("main");
  const dialog = page.getByRole("dialog", { name: "Weekly session report" });
  const highlights = dialog.getByRole("textbox").first();
  async function openFor(sessionLabel: string) {
    const label = sessionDisplayName(sessionLabel) ?? sessionLabel;
    await chooseRowAction(
      page,
      main.getByRole("row").filter({ has: page.getByRole("cell", { name: label, exact: true }) }),
      "Weekly session report",
    );
    await expect(dialog).toBeVisible();
  }

  await openFor(sessionA.sessionLabel);
  await expect(highlights).toHaveValue(sessionA.highlights);
  await highlights.fill(typed);
  await closeDialog(page, dialog);

  await openFor(sessionA.sessionLabel);
  await expect(highlights).toHaveValue(sessionA.highlights);
  await closeDialog(page, dialog);

  await openFor(sessionB.sessionLabel);
  await expect(highlights).toHaveValue(sessionB.highlights);
});
