import { inArray, sql } from "drizzle-orm";

import { db } from "#/db/client";
import { interventionSession, sessionRecording, transcription } from "#/db/schema";
import { objectId } from "#/lib/crypto";
import { expect, test } from "#/tests/fixtures";
import { required, signInWithEmail } from "#/tests/helpers";
import { cellUnder, getUrl, rowWithCell } from "#/tests/pages/helpers";

type SupervisedGroup = {
  email: string;
  userId: string;
  supervisorId: string;
  fellowId: string;
  groupId: string;
  groupName: string;
  schoolId: string;
  hubId: string;
  projectId: string | null;
  sessionNameId: string;
};

async function pickSupervisedGroup() {
  const {
    rows: [row],
  } = await db.execute<SupervisedGroup>(sql`
    select u.email, u.id as "userId", f.supervisor_id as "supervisorId", f.id as "fellowId",
      g.id as "groupId", g.group_name as "groupName", sc.id as "schoolId", sc.hub_id as "hubId",
      g.project_id as "projectId",
      (select n.id from session_names n where n.hub_id = sc.hub_id
        and n.session_type = 'INTERVENTION' order by n.session_name limit 1) as "sessionNameId"
    from fellows f
    join implementer_members m on m.identifier = f.supervisor_id and m.role = 'SUPERVISOR'
    join users u on u.id = m.user_id
    join intervention_groups g on g.leader_id = f.id and g.archived_at is null
    join schools sc on sc.id = g.school_id
    where coalesce(f.dropped_out, false) = false
    order by g.id
    limit 1`);
  required(row, "a supervisor whose fellow leads a group");
  required(row.sessionNameId, "an intervention session name in the group's hub");
  return row;
}

test("a recording no transcription was queued for shows as uploaded, a queued one as pending", async ({
  page,
  context,
  undo,
}) => {
  const group = await pickSupervisedGroup();
  // One held session per recording, since a group has one recording per session.
  const recordings = [11, 22].map((kilobytes, index) => {
    const sessionDate = new Date(Date.UTC(2020, 0, 6 + index, 9));
    return {
      session: {
        id: objectId("isess"),
        schoolId: group.schoolId,
        hubId: group.hubId,
        projectId: group.projectId,
        sessionId: group.sessionNameId,
        occurred: true,
        yearOfImplementation: sessionDate.getFullYear(),
        sessionDate,
      },
      recordingId: objectId("rec"),
      fileSize: kilobytes * 1024,
    };
  });
  const sessionIds = recordings.map(({ session }) => session.id);
  const recordingIds = recordings.map(({ recordingId }) => recordingId);
  await db.insert(interventionSession).values(recordings.map(({ session }) => session));
  undo(async () => {
    await db.delete(transcription).where(inArray(transcription.recordingId, recordingIds));
    await db.delete(sessionRecording).where(inArray(sessionRecording.id, recordingIds));
    await db.delete(interventionSession).where(inArray(interventionSession.id, sessionIds));
  });
  await db.insert(sessionRecording).values(
    recordings.map(({ session, recordingId, fileSize }) => ({
      id: recordingId,
      fileName: `${recordingId}.mp3`,
      originalFileName: "E2E recording.mp3",
      s3Key: `e2e/${recordingId}.mp3`,
      contentType: "audio/mpeg",
      fileSize,
      fellowId: group.fellowId,
      schoolId: group.schoolId,
      groupId: group.groupId,
      sessionId: session.id,
      uploadedBy: group.userId,
      supervisorId: group.supervisorId,
    })),
  );
  const [uploaded, queued] = recordings;
  required(uploaded, "the uploaded recording");
  required(queued, "the queued recording");
  await db.insert(transcription).values({ recordingId: queued.recordingId });
  await signInWithEmail(context, group.email);

  await page.goto(getUrl("/sc/reporting/recordings"));
  const groupRows = await rowWithCell(page, page.getByRole("main"), group.groupName);
  const rowOfSize = (size: string) =>
    groupRows.filter({ has: page.getByRole("cell", { name: size, exact: true }) });
  await expect(await cellUnder(page, rowOfSize("11.0 KB"), "Status")).toHaveText("Uploaded");
  await expect(await cellUnder(page, rowOfSize("22.0 KB"), "Status")).toHaveText("Pending");
});
