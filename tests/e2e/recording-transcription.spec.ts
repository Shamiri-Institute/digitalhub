import type { Page } from "@playwright/test";

import { expect, test } from "#/tests/fixtures";
import { format } from "date-fns";
import { eq, sql } from "drizzle-orm";

import { db } from "#/db/client";
import { interventionSession, sessionRecording } from "#/db/schema";
import { objectId } from "#/lib/crypto";
import { deleteObject } from "#/lib/s3/s3.service";
import { sessionDisplayName } from "#/lib/utils";
import { raceOnRow, required, signInWithEmail } from "#/tests/helpers";
import { cellUnder, chooseRowAction, getUrl, rowWithCell } from "#/tests/pages/helpers";

// Uploads a recording through the UI to the local S3 (scripts/local-s3.sh), then runs the cron
// worker and reads the transcript back. The worker calls Gemini for real and spends a few cents a
// run, so transcription never runs in CI, and locally it skips without credentials or an A/B
// supervisor. Without an A/B supervisor the upload goes to any seeded supervisor.
const transcribingSupervisorId = process.env.FIDELITY_AB_TEST_SUPERVISOR_IDS?.split(",")[0];
const hasGemini = !!process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_USE_VERTEXAI === "true";
test.skip(!process.env.AWS_ENDPOINT_URL_S3, "needs the local S3 server (scripts/local-s3.sh)");
test.describe.configure({ mode: "serial" });

type SupervisedGroup = {
  email: string;
  fellowName: string;
  groupName: string;
  schoolName: string;
  schoolId: string;
  hubId: string;
  projectId: string | null;
  sessionNameId: string;
  sessionName: string;
  sessionType: string | null;
};

let target: SupervisedGroup & { sessionId: string; sessionDate: Date };

// Seeded supervisors have a recording for every occurred session, so the spec adds its own
// occurred session at the group's school, copied from one the school already has.
test.beforeAll(async () => {
  const {
    rows: [group],
  } = await db.execute<SupervisedGroup>(sql`
    select u.email, f.fellow_name as "fellowName", g.group_name as "groupName",
      sc.school_name as "schoolName", sc.id as "schoolId", i.hub_id as "hubId",
      i.project_id as "projectId", sn.id as "sessionNameId", sn.session_name as "sessionName",
      i.session_type as "sessionType"
    from fellows f
    join implementer_members m on m.identifier = f.supervisor_id and m.role = 'SUPERVISOR'
    join users u on u.id = m.user_id
    join intervention_groups g on g.leader_id = f.id
    join schools sc on sc.id = g.school_id
    join intervention_sessions i on i.school_id = g.school_id and i.occurred
    join session_names sn on sn.id = i.session_id
    where coalesce(f.dropped_out, false) = false
      ${transcribingSupervisorId ? sql`and f.supervisor_id = ${transcribingSupervisorId}` : sql``}
    order by g.id, i.session_date desc
    limit 1`);
  required(group, "an occurred session at a school of a supervisor's fellows");

  const sessionDate = new Date(Date.UTC(2020, 0, 6, 9));
  const [created] = await db
    .insert(interventionSession)
    .values({
      id: objectId("session"),
      schoolId: group.schoolId,
      hubId: group.hubId,
      projectId: group.projectId,
      sessionId: group.sessionNameId,
      sessionType: group.sessionType,
      occurred: true,
      yearOfImplementation: sessionDate.getFullYear(),
      sessionDate,
    })
    .returning({ id: interventionSession.id });
  required(created, "the inserted session");
  target = { ...group, sessionId: created.id, sessionDate };
});

test.afterAll(async () => {
  if (!target) return; // beforeAll failed before inserting the session
  const removed = await db
    .delete(sessionRecording)
    .where(eq(sessionRecording.sessionId, target.sessionId))
    .returning({ s3Key: sessionRecording.s3Key });
  await Promise.all(removed.map(({ s3Key }) => deleteObject({ Key: s3Key }, "recordings")));
  await db.delete(interventionSession).where(eq(interventionSession.id, target.sessionId));
});

// The uploaded file is 67.0 KB; the group's seeded recordings of this session name are not.
async function uploadedRow(page: Page) {
  return (await rowWithCell(page, page.getByRole("main"), target.groupName))
    .filter({ has: page.getByRole("cell", { name: target.sessionName, exact: true }) })
    .filter({ has: page.getByRole("cell", { name: "67.0 KB", exact: true }) });
}

test("a supervisor uploads a session recording, and the dialog stays open until it is saved", async ({
  context,
  page,
}) => {
  await signInWithEmail(context, target.email);
  await page.goto(getUrl("/sc/reporting/recordings"));

  await page.getByRole("button", { name: "Upload recording" }).click();
  const dialog = page.getByRole("dialog", { name: "Upload recording" });
  await dialog.getByRole("button", { name: "Select a fellow" }).click();
  await page.getByRole("option", { name: target.fellowName, exact: true }).click();
  await dialog
    .getByRole("combobox")
    .filter({ hasText: /^Select group$/ })
    .click();
  await page
    .getByRole("option", { name: `${target.groupName} (${target.schoolName})`, exact: true })
    .click();
  await dialog
    .getByRole("combobox")
    .filter({ hasText: /^Select a session$/ })
    .click();
  const sessionLabel = sessionDisplayName(target.sessionName) ?? target.sessionName;
  await page
    .getByRole("option", {
      name: `${sessionLabel} - ${format(new Date(target.sessionDate), "dd MMM yyyy")}`,
      exact: true,
    })
    .click();
  await dialog.getByLabel("Audio file").setInputFiles("tests/e2e/fixtures/session-recording.mp3");
  // Recording the upload checks the session row, so locking it holds the upload in flight, past
  // the file's PUT to S3: closing then would hide the outcome of a save that still happens.
  await raceOnRow("intervention_sessions", target.sessionId, async (waitForWaiting) => {
    await dialog.getByRole("button", { name: "Upload", exact: true }).click();
    await waitForWaiting(1);
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveAttribute("data-state", "open");
    await expect(dialog.getByRole("button", { name: "Close" })).toBeDisabled();
    await expect(dialog.getByRole("button", { name: "Cancel" })).toBeDisabled();
  });
  await expect(dialog).toBeHidden({ timeout: 120_000 });

  await page.reload();
  await expect(await cellUnder(page, await uploadedRow(page), "Status")).toHaveText("Pending");
});

test("an uploaded recording is transcribed and its transcript can be read", async ({
  context,
  page,
  request,
}) => {
  test.skip(!!process.env.CI, "calls Gemini, which CI must not pay for");
  test.skip(
    !transcribingSupervisorId || !hasGemini || !process.env.CRON_SECRET,
    "needs FIDELITY_AB_TEST_SUPERVISOR_IDS, Gemini credentials and CRON_SECRET",
  );
  test.setTimeout(10 * 60_000);
  await signInWithEmail(context, target.email);

  const worker = await request.get(getUrl("/api/cron/transcriptions"), {
    headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
    timeout: 9 * 60_000,
  });
  expect(worker.status()).toBe(200);

  await page.goto(getUrl("/sc/reporting/recordings"));
  const transcribedRow = await uploadedRow(page);
  await expect(await cellUnder(page, transcribedRow, "Status")).toHaveText("Completed");

  await chooseRowAction(page, transcribedRow, "View transcript");
  const transcript = page.getByRole("dialog", { name: "Transcript" });
  await expect(transcript).toContainText(/growth mindset/i);
});
