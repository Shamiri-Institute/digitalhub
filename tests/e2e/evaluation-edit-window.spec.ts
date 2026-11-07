import type { Locator, Page } from "@playwright/test";
import { eq, sql } from "drizzle-orm";

import { db } from "#/db/client";
import { interventionGroupReport, weeklyFellowRatings } from "#/db/schema";
import { objectId } from "#/lib/crypto";
import { expect, test, type Undo } from "#/tests/fixtures";
import { signableMember, signInWithEmail, uniqueFellowName, required } from "#/tests/helpers";
import { chooseRowAction, expandRow, getUrl, searchRows } from "#/tests/pages/helpers";

test.describe.configure({ mode: "serial" });

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

type Fixture = { email: string; supervisorId: string; fellowId: string; fellowName: string };
let fixture: Fixture;

test.beforeAll(async () => {
  const {
    rows: [row],
  } = await db.execute<Fixture>(sql`
    select u.email, sv.id as "supervisorId", f.id as "fellowId", f.fellow_name as "fellowName"
    from implementer_members m
    join users u on u.id = m.user_id
    join supervisors sv on sv.id = m.identifier
    join hubs h on h.id = sv.hub_id and h.project_id is not null
    join fellows f on f.supervisor_id = sv.id and f.fellow_name is not null
      and coalesce(f.dropped_out, false) = false
    where m.role = 'SUPERVISOR' and ${signableMember()} and ${uniqueFellowName()}
      and not exists (select 1 from weekly_fellow_ratings w where w.fellow_id = f.id)
    order by u.email desc, f.id desc
    limit 1`);
  required(row, "no supervised fellow without a weekly evaluation");
  fixture = row;
});

async function saveEvaluation(createdAt: Date, undo: Undo) {
  const notes = `saved notes ${Date.now()}`;
  const [rating] = await db
    .insert(weeklyFellowRatings)
    .values({
      fellowId: fixture.fellowId,
      supervisorId: fixture.supervisorId,
      week: new Date(),
      createdAt,
      behaviourNotes: notes,
      programDeliveryNotes: notes,
      dressingAndGroomingNotes: notes,
      punctualityNotes: notes,
      behaviourRating: 3,
      programDeliveryRating: 3,
      dressingAndGroomingRating: 3,
      punctualityRating: 3,
    })
    .returning({ id: weeklyFellowRatings.id });
  if (!rating) throw new Error("could not insert the weekly fellow rating fixture");
  undo(() => db.delete(weeklyFellowRatings).where(eq(weeklyFellowRatings.id, rating.id)));
  return { id: rating.id, notes };
}

async function openEvaluation(page: Page) {
  await page.goto(getUrl("/sc/fellows"));
  await chooseRowAction(
    page,
    await searchRows(page, fixture.fellowName),
    "Submit weekly fellow evaluation",
  );
  const dialog = page.getByRole("dialog", { name: "Weekly fellow evaluation" });
  await expect(dialog).toBeVisible();
  return dialog;
}

async function expectLocked(dialog: Locator) {
  const notes = dialog.getByRole("textbox");
  await expect(notes).toHaveCount(4);
  for (const box of await notes.all()) {
    await expect(box).toBeDisabled();
  }
  await expect(dialog.getByRole("button", { name: "Update & save" })).toBeDisabled();
  await expect(dialog.getByText(/^Update ratings by/)).toBeHidden();
}

test("a weekly evaluation saved more than 14 days ago opens locked", async ({
  page,
  context,
  undo,
}) => {
  const saved = await saveEvaluation(new Date(Date.now() - 15 * DAY_MS), undo);
  await signInWithEmail(context, fixture.email);

  const dialog = await openEvaluation(page);
  await expect(dialog.getByRole("textbox").first()).toHaveValue(saved.notes);
  await expectLocked(dialog);
});

test("an open weekly evaluation locks when its 14 days run out", async ({
  page,
  context,
  undo,
}) => {
  await saveEvaluation(new Date(Date.now() - 14 * DAY_MS + HOUR_MS), undo);
  await page.clock.install();
  await signInWithEmail(context, fixture.email);

  const dialog = await openEvaluation(page);
  await expect(dialog.getByText(/^Update ratings by/)).toBeVisible();
  await expect(dialog.getByRole("textbox").first()).toBeEnabled();
  await expect(dialog.getByRole("button", { name: "Update & save" })).toBeEnabled();

  await page.clock.fastForward("01:00:05");
  await expectLocked(dialog);
});

test("saving a weekly evaluation past its 14 days is refused", async ({ page, context, undo }) => {
  const saved = await saveEvaluation(new Date(Date.now() - 14 * DAY_MS + HOUR_MS), undo);
  await signInWithEmail(context, fixture.email);

  const dialog = await openEvaluation(page);
  await dialog.getByRole("textbox").first().fill(`changed notes ${Date.now()}`);
  // Ageing the row behind the open dialog leaves the browser believing it may still edit, as one
  // whose clock runs behind would, so only the server can refuse this save.
  await db
    .update(weeklyFellowRatings)
    .set({ createdAt: new Date(Date.now() - 15 * DAY_MS) })
    .where(eq(weeklyFellowRatings.id, saved.id));
  await dialog.getByRole("button", { name: "Update & save" }).click();
  await expect(page.getByText(/can no longer be edited/).first()).toBeVisible();

  const reopened = await openEvaluation(page);
  await expect(reopened.getByRole("textbox").first()).toHaveValue(saved.notes);
  await expectLocked(reopened);
});

test("editing a weekly evaluation from the report past its 14 days is refused", async ({
  page,
  context,
  undo,
}) => {
  const saved = await saveEvaluation(new Date(Date.now() - 15 * DAY_MS), undo);
  await signInWithEmail(context, fixture.email);

  await page.goto(getUrl("/sc/reporting/fellow-reports/weekly-fellow-evaluation"));
  const weeks = await expandRow(page, await searchRows(page, fixture.fellowName));
  await chooseRowAction(page, weeks.getByRole("row").last(), "Edit weekly evaluation");
  const dialog = page.getByRole("dialog", { name: "Edit Weekly fellow evaluation" });
  await dialog.getByRole("textbox").first().fill(`changed notes ${Date.now()}`);
  await dialog.getByRole("button", { name: "Save Changes" }).click();
  await expect(page.getByText(/can no longer be edited/).first()).toBeVisible();

  const reopened = await openEvaluation(page);
  await expect(reopened.getByRole("textbox").first()).toHaveValue(saved.notes);
});

test("editing a student group evaluation from the report past its 14 days is refused", async ({
  page,
  context,
  undo,
}) => {
  // A fellow the supervisor supervises who leads a group with no evaluations, so the report lists
  // only the one this test saves under them.
  const {
    rows: [leader],
  } = await db.execute<{ email: string; groupId: string; fellowName: string }>(sql`
    select u.email, g.id as "groupId", f.fellow_name as "fellowName"
    from implementer_members m
    join users u on u.id = m.user_id
    join supervisors sv on sv.id = m.identifier
    join fellows f on f.supervisor_id = sv.id and f.fellow_name is not null
    join intervention_groups g on g.leader_id = f.id
    where m.role = 'SUPERVISOR' and ${signableMember()} and ${uniqueFellowName()}
      and not exists (select 1 from intervention_group_reports r
        join intervention_groups lg on lg.id = r.group_id where lg.leader_id = f.id)
    order by u.email, g.id
    limit 1`);
  required(leader, "a supervised fellow whose groups have no evaluations");
  const comment = `saved comment ${Date.now()}`;
  const reportId = objectId("ige");
  await db.insert(interventionGroupReport).values({
    id: reportId,
    groupId: leader.groupId,
    createdAt: new Date(Date.now() - 15 * DAY_MS),
    engagementComment: comment,
    cooperationComment: comment,
    contentComment: comment,
  });
  undo(() => db.delete(interventionGroupReport).where(eq(interventionGroupReport.id, reportId)));
  await signInWithEmail(context, leader.email);

  await page.goto(getUrl("/sc/reporting/fellow-reports/student-group-evaluation"));
  const sessions = await expandRow(page, await searchRows(page, leader.fellowName));
  await chooseRowAction(page, sessions.getByRole("row").last(), "Edit student group evaluation");
  const dialog = page.getByRole("dialog", { name: "Edit Student Group Evaluation" });
  await dialog.getByRole("textbox").first().fill(`changed comment ${Date.now()}`);
  await dialog.getByRole("button", { name: "Save Changes" }).click();
  await expect(page.getByText(/can no longer be edited/).first()).toBeVisible();

  await page.reload();
  const reloaded = await expandRow(page, await searchRows(page, leader.fellowName));
  await chooseRowAction(page, reloaded.getByRole("row").last(), "View student group evaluation");
  await expect(
    page
      .getByRole("dialog", { name: "View Student Group Evaluation" })
      .getByRole("textbox")
      .first(),
  ).toHaveValue(comment);
});
