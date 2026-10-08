import { type BrowserContext, expect, type Locator, type Page, test } from "@playwright/test";
import { eq, sql } from "drizzle-orm";

import { db } from "#/db/client";
import { fellow, interventionGroupReport, sessionRecording } from "#/db/schema";
import { sessionDisplayName } from "#/lib/utils";
import { signableMember, signInWithEmail } from "#/tests/helpers";
import { getUrl } from "#/tests/pages/helpers";

/**
 * Each write checks that its record is in the caller's scope: a fellow evaluates a group they
 * lead for a session at its school, a supervisor edits a recording of a group their fellow leads
 * at an occurred session, and a hub coordinator reassigns a fellow of their organisation. Each
 * test saves through the UI, reloads and checks what the page shows. The database is read only to
 * pick fixtures, to read a saved value back and to put rows back.
 */

// The dev server compiles each page on first use, which can take longer than the default.
test.describe.configure({ mode: "serial", timeout: 3 * 60 * 1000 });

type EvaluationFixture = {
  email: string;
  visibleId: string;
  groupId: string;
  groupName: string;
  sessionId: string;
  sessionLabel: string;
};
type RecordingFixture = {
  email: string;
  recordingId: string;
  groupName: string;
  sessionName: string;
  originalFileName: string;
};
type ReassignFixture = {
  email: string;
  fellowId: string;
  fellowName: string;
  originalSupervisorId: string;
  newSupervisorName: string;
};

let evaluation: EvaluationFixture;
let recording: RecordingFixture;
let reassign: ReassignFixture;

/** Only users with one membership, in an organisation that runs the default project. */
test.beforeAll(async () => {
  // A group with no evaluations yet, and an occurred session whose name is unique at its school.
  const {
    rows: [ledGroup],
  } = await db.execute<EvaluationFixture>(sql`
    select u.email, s.visible_id as "visibleId", g.id as "groupId", g.group_name as "groupName",
      i.id as "sessionId", sn.session_name as "sessionLabel"
    from intervention_groups g
    join implementer_members m on m.identifier = g.leader_id and m.role = 'FELLOW'
    join users u on u.id = m.user_id and u.email is not null
    join schools s on s.id = g.school_id
    join intervention_sessions i on i.school_id = s.id and i.occurred
    join session_names sn on sn.id = i.session_id
    where ${signableMember()} and g.archived_at is null
      and not exists (select 1 from intervention_group_reports r where r.group_id = g.id)
      and (select count(*) from intervention_groups o
        where o.school_id = g.school_id and o.group_name = g.group_name) = 1
      and (select count(*) from intervention_sessions o
        where o.school_id = s.id and o.occurred and o.session_id = i.session_id) = 1
    order by u.email desc, g.id, i.session_date
    limit 1`);
  if (!ledGroup) throw new Error("seed the database first: no fellow group without evaluations");
  evaluation = {
    ...ledGroup,
    sessionLabel: sessionDisplayName(ledGroup.sessionLabel) ?? ledGroup.sessionLabel,
  };

  // The edit keeps the recording's fellow, group and session, which must be an occurred one.
  // recordings-status-api.spec.ts borrows the first three recordings by id, so skip those.
  const {
    rows: [supervisedRecording],
  } = await db.execute<RecordingFixture>(sql`
    select u.email, r.id as "recordingId", g.group_name as "groupName",
      sn.session_name as "sessionName", r.original_file_name as "originalFileName"
    from session_recordings r
    join fellows f on f.id = r.fellow_id and f.supervisor_id = r.supervisor_id
    join intervention_groups g on g.id = r.group_id and g.leader_id = r.fellow_id
      and g.school_id = r.school_id
    join intervention_sessions i on i.id = r.intervention_session_id and i.school_id = g.school_id
      and i.occurred
    join session_names sn on sn.id = i.session_id
    join implementer_members m on m.identifier = r.supervisor_id and m.role = 'SUPERVISOR'
    join users u on u.id = m.user_id and u.email is not null
    where ${signableMember()} and r.archived_at is null
      and r.id not in (
        select o.id from session_recordings o where o.archived_at is null order by o.id limit 3)
    order by r.id desc
    limit 1`);
  if (!supervisedRecording) {
    throw new Error("seed the database first: no recording at an occurred session");
  }
  recording = supervisedRecording;

  // The coordinator's fellows page lists only fellows whose home hub is the coordinator's hub, so
  // a borrowed fellow cannot be reached from the UI.
  const {
    rows: [hubFellow],
  } = await db.execute<ReassignFixture>(sql`
    select u.email, f.id as "fellowId", f.fellow_name as "fellowName",
      f.supervisor_id as "originalSupervisorId", sv.supervisor_name as "newSupervisorName"
    from hub_coordinators hc
    join hubs h on h.id = hc.assigned_hub_id
    join implementer_members m on m.identifier = hc.id and m.role = 'HUB_COORDINATOR'
    join users u on u.id = m.user_id and u.email is not null
    join fellows f on f.hub_id = h.id and f.implementer_id = h.implementer_id
      and f.supervisor_id is not null and f.fellow_name is not null
    join supervisors sv on sv.hub_id = h.id and sv.id <> f.supervisor_id
      and sv.supervisor_name is not null
    where ${signableMember()}
      and (select count(*) from fellows o where o.fellow_name = f.fellow_name) = 1
      and (select count(*) from supervisors o
        where o.hub_id = sv.hub_id and o.supervisor_name = sv.supervisor_name) = 1
    order by u.email desc, f.id desc, sv.id
    limit 1`);
  if (!hubFellow) throw new Error("seed the database first: no fellow with another supervisor");
  reassign = hubFellow;
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
  await signInWithEmail(context, email);
}

/** A row by the exact text of one of its cells, after searching the table for it. */
async function rowWithCell(page: Page, scope: Locator, text: string) {
  await scope.getByPlaceholder("Search...").fill(text);
  return scope
    .getByRole("row")
    .filter({ has: page.getByRole("cell", { name: text, exact: true }) });
}

/** Opens a row's actions menu. Rows re-render while their data loads, so retry the click. */
async function openRowMenu(page: Page, row: Locator) {
  await expect(async () => {
    await row.getByRole("cell").last().click();
    await expect(page.getByRole("menu")).toBeVisible({ timeout: 2000 });
  }).toPass({ timeout: 30_000 });
}

test("a fellow evaluates a group they lead", async ({ page, context }) => {
  const comment = `e2e-scoped-write-${Date.now()}`;
  undo.push(() =>
    db
      .delete(interventionGroupReport)
      .where(eq(interventionGroupReport.groupId, evaluation.groupId)),
  );
  await signIn(context, evaluation.email);
  const main = page.getByRole("main");
  const dialog = page.getByRole("dialog", { name: "Student group evaluation" });
  async function openEvaluation() {
    await page.goto(getUrl(`/fel/schools/${evaluation.visibleId}/group`), {
      waitUntil: "networkidle",
    });
    await openRowMenu(page, await rowWithCell(page, main, evaluation.groupName));
    await page.getByRole("menuitem", { name: "View student group evaluation" }).click();
  }

  await openEvaluation();
  await dialog.getByRole("combobox").click();
  await page
    .getByRole("option")
    .filter({ hasText: `${evaluation.sessionLabel} - ` })
    .click();
  // The star buttons are unlabelled and laid out in reverse: the first one gives five stars.
  for (const rating of await dialog.locator(".rating-stars").all()) {
    await rating.getByRole("button").first().click();
  }
  for (const commentBox of await dialog.getByRole("textbox").all()) {
    await commentBox.fill(comment);
  }
  await dialog.getByRole("button", { name: "Submit" }).click();
  await expect(dialog).toBeHidden();

  await openEvaluation();
  await expect(dialog.getByRole("combobox")).toContainText(evaluation.sessionLabel);
  await expect(dialog.getByRole("textbox").first()).toHaveValue(comment);
  const [savedReport] = await db
    .select({
      sessionId: interventionGroupReport.sessionId,
      content: interventionGroupReport.content,
    })
    .from(interventionGroupReport)
    .where(eq(interventionGroupReport.groupId, evaluation.groupId));
  expect(savedReport).toEqual({ sessionId: evaluation.sessionId, content: 5 });
});

test("a supervisor renames a recording of their fellow's group", async ({ page, context }) => {
  const newFileName = `e2e-scoped-write-${Date.now()}`;
  undo.push(() =>
    db
      .update(sessionRecording)
      .set({ originalFileName: recording.originalFileName })
      .where(eq(sessionRecording.id, recording.recordingId)),
  );
  await signIn(context, recording.email);
  const main = page.getByRole("main");
  const dialog = page.getByRole("dialog", { name: "Edit recording" });
  async function openEdit() {
    await page.goto(getUrl("/sc/reporting/recordings"), { waitUntil: "networkidle" });
    const recordingRow = (await rowWithCell(page, main, recording.groupName)).filter({
      has: page.getByRole("cell", { name: recording.sessionName, exact: true }),
    });
    await openRowMenu(page, recordingRow);
    await page.getByRole("menuitem", { name: "Edit" }).click();
    // The dialog resets its form once its lists load; wait for the session to show.
    await expect(dialog.getByRole("combobox", { name: /^Session/ })).toContainText(
      sessionDisplayName(recording.sessionName) ?? recording.sessionName,
    );
  }

  await openEdit();
  await dialog.getByRole("textbox", { name: /Recording name/ }).fill(newFileName);
  await dialog.getByRole("button", { name: "Save changes" }).click();
  await expect(dialog).toBeHidden();

  await openEdit();
  await expect(dialog.getByRole("textbox", { name: /Recording name/ })).toHaveValue(newFileName);
  const [savedRecording] = await db
    .select({ originalFileName: sessionRecording.originalFileName })
    .from(sessionRecording)
    .where(eq(sessionRecording.id, recording.recordingId));
  expect(savedRecording?.originalFileName).toBe(newFileName);
});

test("a hub coordinator assigns a fellow of their hub to another supervisor", async ({
  page,
  context,
}) => {
  undo.push(() =>
    db
      .update(fellow)
      .set({ supervisorId: reassign.originalSupervisorId })
      .where(eq(fellow.id, reassign.fellowId)),
  );
  await signIn(context, reassign.email);
  const main = page.getByRole("main");
  await page.goto(getUrl("/hc/fellows"), { waitUntil: "networkidle" });

  const fellowRow = await rowWithCell(page, main, reassign.fellowName);
  await fellowRow.getByRole("combobox").click();
  await page.getByRole("option", { name: reassign.newSupervisorName, exact: true }).click();
  await expect(
    page.getByText(
      `Successfully assigned ${reassign.fellowName} to ${reassign.newSupervisorName}.`,
      {
        exact: true,
      },
    ),
  ).toBeVisible();

  await page.reload({ waitUntil: "networkidle" });
  await expect(
    (await rowWithCell(page, main, reassign.fellowName)).getByRole("combobox"),
  ).toHaveText(reassign.newSupervisorName);
});
