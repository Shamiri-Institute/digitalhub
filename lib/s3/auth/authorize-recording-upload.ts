import "server-only";

import { and, eq, isNull, or } from "drizzle-orm";

import { currentSupervisorLite } from "#/app/auth";
import { db } from "#/db/client";
import { ImplementerRole } from "#/db/enums";
import { fellow as fellowTable } from "#/db/schema";
import { ForbiddenRoleError, requireAuthRole } from "#/lib/auth/require-auth-role";
import { objectId } from "#/lib/crypto";
import {
  buildRecordingsS3Key,
  generateRecordingFilename,
} from "#/lib/s3/key-builders/build-recordings-s3-key";
import { UploadAuthorizationError } from "#/lib/s3/s3.errors";
import {
  extensionForRecordingContentType,
  MAX_FILE_SIZE,
  type S3AuthParams,
  type UploadTarget,
} from "#/lib/s3/s3.types";
import { normalizeContentType } from "#/lib/s3/utils/normalize-content-type";

export async function authorizeRecordingUpload(
  params: S3AuthParams,
): Promise<Extract<UploadTarget, { bucket: "recordings" }>> {
  await requireAuthRole(ImplementerRole.SUPERVISOR).catch((error: unknown) => {
    if (error instanceof ForbiddenRoleError) throw new UploadAuthorizationError("Forbidden", 403);
    throw error;
  });

  const supervisor = await currentSupervisorLite();
  if (!supervisor?.profile?.id) throw new UploadAuthorizationError("Forbidden", 403);
  const supervisorId = supervisor.profile.id;

  const normalized = normalizeContentType(params.contentType);
  const extension = extensionForRecordingContentType(normalized);
  if (!extension) throw new UploadAuthorizationError("Unsupported content type");
  if (params.size > MAX_FILE_SIZE) throw new UploadAuthorizationError("File too large");

  // Active fellows led by this supervisor; the group must belong to one of them.
  const supervisedFellows = db
    .select({ id: fellowTable.id })
    .from(fellowTable)
    .where(
      and(
        eq(fellowTable.supervisorId, supervisorId),
        or(eq(fellowTable.droppedOut, false), isNull(fellowTable.droppedOut)),
      ),
    );

  const group = await db.query.interventionGroup.findFirst({
    where: (g, { and, eq, inArray }) =>
      and(eq(g.id, params.groupId), inArray(g.leaderId, supervisedFellows)),
    columns: { id: true, groupName: true, schoolId: true },
    with: {
      school: { columns: { schoolName: true } },
      leader: { columns: { id: true, fellowName: true } },
    },
  });
  if (!group) throw new UploadAuthorizationError("Forbidden", 403);

  const fellow = group.leader;

  const session = await db.query.interventionSession.findFirst({
    where: (s, { and, eq }) =>
      and(eq(s.id, params.sessionId), eq(s.schoolId, group.schoolId), eq(s.occurred, true)),
    columns: { id: true, sessionType: true },
  });
  if (!session) throw new UploadAuthorizationError("Forbidden", 403);

  const existing = await db.query.sessionRecording.findFirst({
    where: (r, { and, eq }) =>
      and(
        eq(r.fellowId, fellow.id),
        eq(r.schoolId, group.schoolId),
        eq(r.groupId, group.id),
        eq(r.sessionId, session.id),
      ),
    columns: { id: true },
  });
  if (existing)
    throw new UploadAuthorizationError("A recording already exists for this session", 409);

  const recordingId = objectId("rec");
  const sessionType = session.sessionType?.trim() || "session";
  const fileName = generateRecordingFilename(sessionType, recordingId, extension);
  const key = buildRecordingsS3Key({
    schoolName: group.school.schoolName.trim() || "unknown-school",
    fellowName: fellow.fellowName?.trim() || "unknown",
    groupName: group.groupName.trim() || "unknown-group",
    sessionType,
    recordingId,
    extension,
  });

  return {
    bucket: "recordings",
    key,
    recordingId,
    fileName,
    contentType: normalized,
    context: {
      recordingId,
      fellowId: fellow.id,
      groupId: group.id,
      sessionId: session.id,
      schoolId: group.schoolId,
      fileName,
    },
  };
}
