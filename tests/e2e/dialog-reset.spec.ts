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
  const leader = page.getByRole("dialog").filter({ hasText: "Select replacement fellow" });
  const leaderSupervisor = leader.getByRole("combobox", { name: /^Select supervisor/ });
  await replace.getByRole("button", { name: "Replace" }).first().click();
  await leaderSupervisor.click();
  await page.getByRole("option").first().click();
  await expect(leaderSupervisor).not.toContainText("Select");
  await page.keyboard.press("Escape");
  await expect(leader).toBeHidden();
  await replace.getByRole("button", { name: "Replace" }).first().click();
  await expect(leaderSupervisor).toContainText("Select");
  await page.keyboard.press("Escape");
  await expect(leader).toBeHidden();
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
  await expect(dialog.getByRole("spinbutton", { name: "Student headcount" })).toBeVisible();
  await highlights.fill(typed);
  await closeDialog(page, dialog);

  await openFor(sessionA.sessionLabel);
  await expect(highlights).toHaveValue(sessionA.highlights);
  await closeDialog(page, dialog);

  await openFor(sessionB.sessionLabel);
  await expect(highlights).toHaveValue(sessionB.highlights);
});

async function expectCountyChangeClearsSubCounty(page: Page, dialog: Locator) {
  const county = dialog.getByRole("combobox", { name: /^County/ });
  const subCounty = dialog.getByRole("combobox", { name: /^Sub-county/ });
  await county.click();
  await page.getByRole("option", { name: "Nairobi", exact: true }).click();
  await subCounty.click();
  await page.getByRole("option", { name: "Dagoretti North", exact: true }).click();
  await expect(subCounty).toContainText("Dagoretti North");
  await county.click();
  await page.getByRole("option", { name: "Mombasa", exact: true }).click();
  await expect(subCounty).toContainText("Select sub-county");
}

async function pickCoordinatorAndProfile(table: "supervisors" | "fellows") {
  const name = sql.raw(table === "supervisors" ? "p.supervisor_name" : "p.fellow_name");
  const {
    rows: [row],
  } = await db.execute<{ email: string; name: string; subCounty: string }>(sql`
    select u.email, ${name} as name, p.sub_county as "subCounty"
    from hub_coordinators hc
    join implementer_members m on m.identifier = hc.id and m.role = 'HUB_COORDINATOR'
    join users u on u.id = m.user_id and u.email is not null
    join ${sql.raw(table)} p on p.hub_id = hc.assigned_hub_id and ${name} is not null
      and p.sub_county is not null and p.county is not null
      and coalesce(p.dropped_out, false) = false
      and (select count(*) from ${sql.raw(table)} o where o.hub_id = p.hub_id
        and ${sql.raw(table === "supervisors" ? "o.supervisor_name" : "o.fellow_name")} = ${name}) = 1
    where ${signableMember()}
    order by u.email, p.id
    limit 1`);
  if (!row) throw new Error(`seed the database first: no ${table} with a sub-county`);
  return row;
}

for (const [table, action, title] of [
  ["supervisors", "Edit supervisor information", "Edit supervisor information"],
  ["fellows", "Edit fellow information", "Edit fellow information"],
] as const) {
  test(`${title} shows the saved sub-county, discards typed text, and clears the sub-county with the county`, async ({
    page,
    context,
  }) => {
    const fixture = await pickCoordinatorAndProfile(table);
    await signInWithEmail(context, fixture.email);
    await page.goto(getUrl(`/hc/${table}`));
    const dialog = page.getByRole("dialog", { name: title });
    const fullName = dialog.getByRole("textbox", { name: /^Full name/ }).first();
    async function open() {
      await chooseRowAction(page, await searchRows(page, fixture.name), action);
      await expect(dialog).toBeVisible();
    }

    await open();
    await expect(dialog.getByRole("combobox", { name: /^Sub-county/ })).toContainText(
      fixture.subCounty,
    );
    await expect(fullName).toHaveValue(fixture.name);
    await fullName.fill(typed);
    await closeDialog(page, dialog);

    await open();
    await expect(fullName).toHaveValue(fixture.name);
    await expectCountyChangeClearsSubCounty(page, dialog);
  });
}

test("add supervisor starts empty on each open and clears the sub-county with the county", async ({
  page,
  context,
}) => {
  const fixture = await pickCoordinatorAndProfile("supervisors");
  await signInWithEmail(context, fixture.email);
  await page.goto(getUrl("/hc/supervisors"));
  const dialog = page.getByRole("dialog", { name: "Add new supervisor" });
  const fullName = dialog.getByRole("textbox", { name: /^Full name/ }).first();
  const subCounty = dialog.getByRole("combobox", { name: /^Sub-county/ });
  async function open() {
    await page.getByRole("button", { name: "Add supervisor" }).click();
    await expect(dialog).toBeVisible();
  }

  await open();
  await expectCountyChangeClearsSubCounty(page, dialog);
  await subCounty.click();
  await page.getByRole("option").first().click();
  await fullName.fill(typed);
  await closeDialog(page, dialog);

  await open();
  await expect(fullName).toHaveValue("");
  await expect(subCounty).toContainText("Select sub-county");
});

test("my profile clears the sub-county when the county changes", async ({ page, context }) => {
  const {
    rows: [fixture],
  } = await db.execute<{ email: string }>(sql`
    select u.email from supervisors s
    join implementer_members m on m.identifier = s.id and m.role = 'SUPERVISOR'
    join users u on u.id = m.user_id and u.email is not null
    where s.sub_county is not null and s.county is not null and ${signableMember()}
    order by u.email
    limit 1`);
  if (!fixture) throw new Error("seed the database first: no supervisor with a sub-county");
  await signInWithEmail(context, fixture.email);
  await page.goto(getUrl("/sc/schedule"));
  await page.getByAltText("Profile arrow drop down icon").click();
  await page.getByRole("menuitem", { name: "My Profile" }).click();
  const dialog = page.getByRole("dialog", { name: "Edit profile" });
  await expectCountyChangeClearsSubCounty(page, dialog);
});

test("schedule a session switches between school and venue with the session type", async ({
  page,
  context,
}) => {
  const fixture = await pickCoordinatorAndProfile("supervisors");
  await signInWithEmail(context, fixture.email);
  await page.goto(getUrl("/hc/schedule"));
  await page.getByRole("button", { name: "Schedule a session" }).click();
  const dialog = page.getByRole("dialog", { name: "Schedule a session" });
  const sessionType = dialog.getByRole("combobox", { name: "Select a session type" });
  const school = dialog.getByRole("combobox", { name: /^Select school/ });
  const venue = dialog.getByRole("textbox", { name: "Enter venue" });

  await sessionType.click();
  await page.getByRole("option", { name: /Supervision 1$/ }).click();
  await expect(venue).toBeVisible();
  await expect(school).toHaveCount(0);
  await venue.fill(typed);
  await sessionType.click();
  await page.getByRole("option", { name: /Clinical 1$/ }).click();
  await expect(school).toBeVisible();
  await expect(venue).toHaveCount(0);
  await sessionType.click();
  await page.getByRole("option", { name: /Supervision 1$/ }).click();
  await expect(venue).toBeVisible();
  await expect(venue).toHaveValue("");
  await expect(school).toHaveCount(0);
  await dialog.getByRole("button", { name: "Pick a time" }).click();
  await expect(page.getByRole("spinbutton", { name: "Hour" })).toBeVisible();
  await expect(page.getByRole("spinbutton", { name: "Minutes" })).toBeVisible();
});

test("mark attendance clears the absence reason when the status changes", async ({
  page,
  context,
}) => {
  const {
    rows: [fixture],
  } = await db.execute<{ email: string; visibleId: string; supervisorName: string }>(sql`
    select u.email, sc.visible_id as "visibleId", sv.supervisor_name as "supervisorName"
    from hub_coordinators hc
    join implementer_members m on m.identifier = hc.id and m.role = 'HUB_COORDINATOR'
    join users u on u.id = m.user_id and u.email is not null
    join schools sc on sc.hub_id = hc.assigned_hub_id and sc.archived_at is null
    join supervisors sv on sv.id = sc.assigned_supervisor_id and sv.supervisor_name is not null
    where ${signableMember()}
      and exists (select 1 from intervention_sessions i where i.school_id = sc.id and i.occurred)
    order by u.email, sc.visible_id
    limit 1`);
  if (!fixture) throw new Error("seed the database first: no school with an occurred session");

  await signInWithEmail(context, fixture.email);
  await page.goto(getUrl(`/hc/schools/${fixture.visibleId}/supervisors`));
  const row = page.getByRole("row").filter({ hasText: fixture.supervisorName }).first();
  await chooseRowAction(page, row, "Mark attendance");
  const dialog = page.getByRole("dialog").filter({ hasText: "Select attendance" });
  await dialog.getByRole("combobox", { name: /^Select session/ }).click();
  await page.getByRole("option").first().click();
  const reason = dialog.getByRole("combobox", { name: "Select reason for above" });
  await dialog.getByRole("radio", { name: "Missed" }).click();
  await reason.click();
  await page.getByRole("option").first().click();
  await expect(reason).not.toContainText("Select a reason");
  await dialog.getByRole("radio", { name: "Attended" }).click();
  await expect(reason).toHaveCount(0);
  await dialog.getByRole("radio", { name: "Missed" }).click();
  await expect(reason).toContainText("Select a reason");
});

async function pickCoordinatorSchools() {
  const {
    rows: [row],
  } = await db.execute<{
    email: string;
    schoolNames: string[];
    visibleIds: string[];
    supervisorNames: (string | null)[];
  }>(sql`
    select u.email,
      (array_agg(s.school_name order by s.visible_id))[1:2] as "schoolNames",
      (array_agg(s.visible_id order by s.visible_id))[1:2] as "visibleIds",
      (array_agg(sv.supervisor_name order by s.visible_id))[1:2] as "supervisorNames"
    from hub_coordinators hc
    join implementer_members m on m.identifier = hc.id and m.role = 'HUB_COORDINATOR'
    join users u on u.id = m.user_id and u.email is not null
    join schools s on s.hub_id = hc.assigned_hub_id and s.archived_at is null
      and s.dropped_out_at is null
      and (select count(*) from schools o where o.school_name = s.school_name) = 1
    join supervisors sv on sv.id = s.assigned_supervisor_id and sv.supervisor_name is not null
    where ${signableMember()}
    group by u.email
    having count(distinct sv.id) >= 2
    order by u.email
    limit 1`);
  if (!row) throw new Error("seed the database first: no coordinator with two schools");
  return row;
}

test("supervisor complaint starts empty on each open", async ({ page, context }) => {
  const fixture = await pickCoordinatorAndProfile("supervisors");
  await signInWithEmail(context, fixture.email);
  await page.goto(getUrl("/hc/supervisors"));
  const dialog = page.getByRole("dialog").filter({ hasText: "Submit complaint" });
  const comments = dialog.getByLabel("Additional comments");
  async function open() {
    await chooseRowAction(page, await searchRows(page, fixture.name), "Submit complaint");
    await expect(dialog).toBeVisible();
  }

  await open();
  await dialog.getByRole("combobox").click();
  await page.getByRole("option").first().click();
  await comments.fill(typed);
  await closeDialog(page, dialog);

  await open();
  await expect(comments).toHaveValue("");
  await expect(dialog.getByRole("combobox")).toContainText("Select a complaint");
});

test("weekly hub report starts empty on each open", async ({ page, context }) => {
  const fixture = await pickCoordinatorSchools();
  await signInWithEmail(context, fixture.email);
  await page.goto(getUrl("/hc/schools"));
  const dialog = page.getByTestId("weekly-hub-report-dialog");
  const recommendations = dialog.getByRole("textbox", { name: "Recommendations" });
  await page.getByRole("button", { name: "Weekly Hub Report" }).click();
  await recommendations.fill(typed);
  await closeDialog(page, dialog);

  await page.getByRole("button", { name: "Weekly Hub Report" }).click();
  await expect(recommendations).toHaveValue("");
});

test("point supervisor shows each school's saved supervisor, not the last choice", async ({
  page,
  context,
}) => {
  const fixture = await pickCoordinatorSchools();
  const [nameA = "", nameB = ""] = fixture.schoolNames;
  const [supervisorA = "", supervisorB = ""] = fixture.supervisorNames.map((n) => n ?? "");
  await signInWithEmail(context, fixture.email);
  await page.goto(getUrl("/hc/schools"));
  const dialog = page.getByRole("dialog", { name: "Change point supervisor" });
  const supervisor = dialog.getByRole("combobox");
  async function openFor(name: string) {
    await chooseRowAction(
      page,
      await rowWithCell(page, page.getByRole("main"), name),
      "Change point supervisor",
    );
    await expect(dialog).toBeVisible();
  }

  await openFor(nameA);
  await expect(supervisor).toContainText(supervisorA);
  await supervisor.click();
  await page.getByRole("option", { name: supervisorB, exact: true }).click();
  await closeDialog(page, dialog);

  await openFor(nameA);
  await expect(supervisor).toContainText(supervisorA);
  await closeDialog(page, dialog);

  await openFor(nameB);
  await expect(supervisor).toContainText(supervisorB);
});

test("new group starts with no supervisor chosen on each open", async ({ page, context }) => {
  const fixture = await pickCoordinatorSchools();
  await signInWithEmail(context, fixture.email);
  await page.goto(getUrl(`/hc/schools/${fixture.visibleIds[0]}/groups`));
  const dialog = page.getByRole("dialog").filter({ hasText: /Select supervisor/ });
  const supervisor = dialog.getByRole("combobox", { name: /^Select supervisor/ });
  await page.getByRole("button", { name: "New group" }).click();
  await supervisor.click();
  await page.getByRole("option").first().click();
  await expect(supervisor).not.toContainText("Select");
  await closeDialog(page, dialog);

  await page.getByRole("button", { name: "New group" }).click();
  await expect(supervisor).toContainText("Select");
});

async function pickCoordinatorStudents() {
  const {
    rows: [row],
  } = await db.execute<{
    email: string;
    visibleId: string;
    admissionNumbers: string[];
    studentNames: string[];
  }>(sql`
    select u.email, sc.visible_id as "visibleId",
      (array_agg(st.admission_number order by st.id))[1:2] as "admissionNumbers",
      (array_agg(st.student_name order by st.id))[1:2] as "studentNames"
    from hub_coordinators hc
    join implementer_members m on m.identifier = hc.id and m.role = 'HUB_COORDINATOR'
    join users u on u.id = m.user_id and u.email is not null
    join schools sc on sc.hub_id = hc.assigned_hub_id and sc.archived_at is null
    join students st on st.school_id = sc.id and st.archived_at is null
      and st.student_name is not null and st.admission_number is not null
      and (select count(*) from students o
        where o.school_id = st.school_id and o.student_name = st.student_name) = 1
    where ${signableMember()}
    group by u.email, sc.visible_id
    having count(*) >= 2
    order by u.email, sc.visible_id
    limit 1`);
  if (!row) throw new Error("seed the database first: no school with two students");
  return row;
}

test("student details, reporting note and school move start from each student's values", async ({
  page,
  context,
}) => {
  const fixture = await pickCoordinatorStudents();
  const [nameA = "", nameB = ""] = fixture.studentNames;
  await signInWithEmail(context, fixture.email);
  await page.goto(getUrl(`/hc/schools/${fixture.visibleId}/students`));
  const main = page.getByRole("main");
  async function openFor(studentName: string, action: string, dialog: Locator) {
    await chooseRowAction(page, await searchRows(page, studentName, main), action);
    await expect(dialog).toBeVisible();
  }

  const details = page.getByRole("dialog", { name: "Edit student information" });
  const studentName = details.getByLabel("Student name");
  await openFor(nameA, "Edit information", details);
  await expect(studentName).toHaveValue(nameA);
  await studentName.fill(typed);
  await closeDialog(page, details);
  await openFor(nameA, "Edit information", details);
  await expect(studentName).toHaveValue(nameA);
  await closeDialog(page, details);
  await openFor(nameB, "Edit information", details);
  await expect(studentName).toHaveValue(nameB);
  await closeDialog(page, details);

  const note = page.getByRole("dialog").filter({ hasText: "Add reporting note" });
  const incident = note.getByRole("textbox").first();
  await openFor(nameA, "Reporting notes", note);
  await incident.fill(typed);
  await closeDialog(page, note);
  await openFor(nameA, "Reporting notes", note);
  await expect(incident).toHaveValue("");
  await closeDialog(page, note);

  const move = page.getByRole("dialog", { name: "Move student to another school" });
  const destination = move.getByRole("combobox", { name: /^Destination school/ });
  await openFor(nameA, "Move to another school", move);
  await destination.click();
  await page.getByRole("option").first().click();
  await expect(destination).not.toContainText("Select a school");
  await closeDialog(page, move);
  await openFor(nameB, "Move to another school", move);
  await expect(destination).toContainText("Select a school");
});

async function expectDropoutDiscardedOnCancel(
  page: Page,
  open: () => Promise<void>,
  title: string,
  validationError: string,
  cancelReturnsToForm = false,
) {
  const form = page.getByRole("dialog").filter({ hasText: title });
  const reason = form.getByRole("combobox", { name: /^Select reason/ });
  await open();
  await reason.click();
  await page.getByRole("option").first().click();
  await form.getByRole("button", { name: "Submit" }).click();
  const confirm = page.getByRole("dialog").filter({ hasText: "Confirm drop out" });
  await expect(confirm.getByText("Are you sure?")).toBeVisible();
  await confirm.getByRole("button", { name: "Cancel" }).click();
  await expect(confirm).toBeHidden();

  if (cancelReturnsToForm) await expect(form).toBeVisible();
  else await open();
  await expect(reason).toContainText("Select a dropout reason");
  await form.getByRole("button", { name: "Submit" }).click();
  await expect(form.getByText(validationError)).toBeVisible();
  await closeDialog(page, form);
}

test("supervisor drop-out discards the reason after cancelling the confirm", async ({
  page,
  context,
}) => {
  const fixture = await pickCoordinatorAndProfile("supervisors");
  await signInWithEmail(context, fixture.email);
  await page.goto(getUrl("/hc/supervisors"));
  await expectDropoutDiscardedOnCancel(
    page,
    async () => chooseRowAction(page, await searchRows(page, fixture.name), "Drop out supervisor"),
    "Drop out supervisor",
    "Please select one of the supplied supervisor dropout reason options",
  );
});

test("school drop-out discards the reason after cancelling the confirm", async ({
  page,
  context,
}) => {
  const fixture = await pickCoordinatorSchools();
  await signInWithEmail(context, fixture.email);
  await page.goto(getUrl("/hc/schools"));
  await expectDropoutDiscardedOnCancel(
    page,
    async () => {
      const row = await rowWithCell(page, page.getByRole("main"), fixture.schoolNames[0] ?? "");
      await row.getByRole("cell").last().click();
      await page.getByRole("menuitem", { name: "Dropout school" }).click();
    },
    "Drop out school",
    "Please select one of the supplied school dropout reason options",
    true,
  );
});

test("student drop-out discards the reason after cancelling the confirm", async ({
  page,
  context,
}) => {
  const fixture = await pickCoordinatorStudents();
  await signInWithEmail(context, fixture.email);
  await page.goto(getUrl(`/hc/schools/${fixture.visibleId}/students`));
  await expectDropoutDiscardedOnCancel(
    page,
    async () =>
      chooseRowAction(
        page,
        await searchRows(page, fixture.studentNames[0] ?? "", page.getByRole("main")),
        "Drop-out student",
      ),
    "Drop out student",
    "Please select reason for drop out.",
  );
});

test("session occurrence goes back to the saved state after cancelling the confirm", async ({
  page,
  context,
}) => {
  const {
    rows: [fixture],
  } = await db.execute<{ email: string; visibleId: string; sessionName: string }>(sql`
    select u.email, s.visible_id as "visibleId", n.session_name as "sessionName"
    from hub_coordinators hc
    join implementer_members m on m.identifier = hc.id and m.role = 'HUB_COORDINATOR'
    join users u on u.id = m.user_id and u.email is not null
    join schools s on s.hub_id = hc.assigned_hub_id and s.archived_at is null
    join intervention_sessions i on i.school_id = s.id and not i.occurred
      and coalesce(i.status::text, '') <> 'Cancelled'
    join session_names n on n.id = i.session_id and n.session_type = 'INTERVENTION'
    where ${signableMember()}
      and (select count(*) from intervention_sessions o
        where o.school_id = s.id and o.session_id = i.session_id) = 1
      and not exists (select 1 from intervention_sessions p
        join session_names pn on pn.id = p.session_id and pn.session_type = n.session_type
        where p.school_id = s.id and not p.occurred and p.session_date < i.session_date
          and coalesce(p.status::text, '') <> 'Cancelled')
    order by u.email, s.visible_id, i.session_date
    limit 1`);
  if (!fixture) throw new Error("seed the database first: no markable session");

  await signInWithEmail(context, fixture.email);
  await page.goto(getUrl(`/hc/schools/${fixture.visibleId}/sessions`));
  const main = page.getByRole("main");
  const label = sessionDisplayName(fixture.sessionName) ?? fixture.sessionName;
  const mark = page
    .getByRole("dialog", { name: "Mark session occurrence" })
    .filter({ hasNotText: "Are you sure?" });
  async function open() {
    await chooseRowAction(
      page,
      main.getByRole("row").filter({ has: page.getByRole("cell", { name: label, exact: true }) }),
      "Mark session occurrence",
    );
    await expect(mark).toBeVisible();
  }

  await open();
  await expect(mark.getByRole("radio", { name: "Unmarked" })).toBeChecked();
  await mark.getByRole("radio", { name: "Attended" }).click();
  await mark.getByRole("button", { name: "Submit" }).click();
  const confirm = page.getByRole("dialog").filter({ hasText: "Are you sure?" });
  await confirm.getByRole("button", { name: "Cancel" }).click();
  await expect(confirm).toBeHidden();

  await open();
  await expect(mark.getByRole("radio", { name: "Unmarked" })).toBeChecked();
});

test("mark attendance shows each session's saved status on reopen and after switching sessions", async ({
  page,
  context,
}) => {
  const {
    rows: [fixture],
  } = await db.execute<{ email: string; visibleId: string; supervisorName: string }>(sql`
    select u.email, sc.visible_id as "visibleId", sv.supervisor_name as "supervisorName"
    from hub_coordinators hc
    join implementer_members m on m.identifier = hc.id and m.role = 'HUB_COORDINATOR'
    join users u on u.id = m.user_id and u.email is not null
    join schools sc on sc.hub_id = hc.assigned_hub_id and sc.archived_at is null
    join supervisors sv on sv.id = sc.assigned_supervisor_id and sv.supervisor_name is not null
    where ${signableMember()}
      and (select count(*) from intervention_sessions i where i.school_id = sc.id and i.occurred) >= 2
    order by u.email, sc.visible_id
    limit 1`);
  if (!fixture) throw new Error("seed the database first: no school with two occurred sessions");

  await signInWithEmail(context, fixture.email);
  await page.goto(getUrl(`/hc/schools/${fixture.visibleId}/supervisors`));
  const row = page.getByRole("row").filter({ hasText: fixture.supervisorName }).first();
  const dialog = page.getByRole("dialog").filter({ hasText: "Select attendance" });
  const session = dialog.getByRole("combobox", { name: /^Select session/ });
  async function checkedStatus() {
    for (const name of ["Attended", "Missed", "Unmarked"]) {
      if (await dialog.getByRole("radio", { name }).isChecked()) return name;
    }
    return null;
  }
  async function open() {
    await chooseRowAction(page, row, "Mark attendance");
    await expect(dialog).toBeVisible();
  }

  await open();
  const savedSession = (await session.textContent()) ?? "";
  const saved = await checkedStatus();
  const other = saved === "Missed" ? "Attended" : "Missed";
  await dialog.getByRole("radio", { name: other }).click();
  await closeDialog(page, dialog);

  await open();
  await expect(session).toHaveText(savedSession);
  expect(await checkedStatus()).toBe(saved);
  await dialog.getByRole("radio", { name: other }).click();
  await session.click();
  await page.getByRole("option").first().click();
  await session.click();
  await page.getByRole("option").last().click();
  expect(await checkedStatus()).toBe(saved);
});
