import { expect, test } from "#/tests/fixtures";
import { format } from "date-fns";
import { eq, sql } from "drizzle-orm";

import { db } from "#/db/client";
import { interventionSession, sessionRecording } from "#/db/schema";
import { objectId } from "#/lib/crypto";
import { deleteObject } from "#/lib/s3/s3.service";
import { sessionDisplayName } from "#/lib/utils";
import { required, signInWithEmail } from "#/tests/helpers";
import { cellUnder, chooseRowAction, getUrl, rowWithCell } from "#/tests/pages/helpers";

// Uploads a recording through the UI to the local S3 (scripts/local-s3.sh), runs the cron worker,
// and reads the transcript back. The worker calls Gemini for real and spends a few cents a run, so
// the spec never runs in CI, and locally it skips without credentials or an A/B supervisor.
const transcribingSupervisorId = process.env.FIDELITY_AB_TEST_SUPERVISOR_IDS?.split(",")[0];
const hasGemini = !!process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_USE_VERTEXAI === "true";
test.skip(!!process.env.CI, "calls Gemini, which CI must not pay for");
test.skip(
  !transcribingSupervisorId ||
    !hasGemini ||
    !process.env.AWS_ENDPOINT_URL_S3 ||
    !process.env.CRON_SECRET,
  "needs FIDELITY_AB_TEST_SUPERVISOR_IDS, Gemini credentials, local S3 and CRON_SECRET",
);

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
    where f.supervisor_id = ${transcribingSupervisorId} and coalesce(f.dropped_out, false) = false
    order by g.id, i.session_date desc
    limit 1`);
  required(group, "an occurred session at a school of the A/B supervisor's fellows");

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

test("an uploaded recording is transcribed and its transcript can be read", async ({
  context,
  page,
  request,
}) => {
  test.setTimeout(10 * 60_000);
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
  await dialog.getByRole("button", { name: "Upload", exact: true }).click();
  await expect(dialog).toBeHidden({ timeout: 120_000 });

  await page.reload();
  const main = page.getByRole("main");
  // The group also has a seeded recording of a session with this name; only the upload is 67.0 KB.
  const uploadedRow = async () =>
    (await rowWithCell(page, main, target.groupName))
      .filter({ has: page.getByRole("cell", { name: target.sessionName, exact: true }) })
      .filter({ has: page.getByRole("cell", { name: "67.0 KB", exact: true }) });
  const row = await uploadedRow();
  await expect(await cellUnder(page, row, "Status")).toHaveText("Pending");

  const worker = await request.get(getUrl("/api/cron/transcriptions"), {
    headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
    timeout: 9 * 60_000,
  });
  expect(worker.status()).toBe(200);

  await page.reload();
  const transcribedRow = await uploadedRow();
  await expect(await cellUnder(page, transcribedRow, "Status")).toHaveText("Completed");

  await chooseRowAction(page, transcribedRow, "View transcript");
  const transcript = page.getByRole("dialog", { name: "Transcript" });
  await expect(transcript).toContainText(/growth mindset/i);
});
