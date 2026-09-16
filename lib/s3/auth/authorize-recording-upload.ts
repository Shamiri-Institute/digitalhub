import "server-only";

import { ImplementerRole } from "@prisma/client";
import { currentSupervisorLite } from "#/app/auth";
import { ForbiddenRoleError, requireAuthRole } from "#/lib/auth/require-auth-role";
import { objectId } from "#/lib/crypto";
import { db } from "#/lib/db";
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

  const normalized = normalizeContentType(params.contentType);
  const extension = extensionForRecordingContentType(normalized);
  if (!extension) throw new UploadAuthorizationError("Unsupported content type");
  if (params.size > MAX_FILE_SIZE) throw new UploadAuthorizationError("File too large");

  const group = await db.interventionGroup.findFirst({
    where: {
      id: params.groupId,
      leader: {
        supervisorId: supervisor.profile.id,
        OR: [{ droppedOut: false }, { droppedOut: null }],
      },
    },
    select: {
      id: true,
      groupName: true,
      schoolId: true,
      school: { select: { schoolName: true } },
      leader: { select: { id: true, fellowName: true } },
    },
  });
  if (!group) throw new UploadAuthorizationError("Forbidden", 403);

  const fellow = group.leader;

  const session = await db.interventionSession.findFirst({
    where: { id: params.sessionId, schoolId: group.schoolId, occurred: true },
    select: { id: true, sessionType: true },
  });
  if (!session) throw new UploadAuthorizationError("Forbidden", 403);

  const existing = await db.sessionRecording.findUnique({
    where: {
      unique_recording_per_session: {
        fellowId: fellow.id,
        schoolId: group.schoolId,
        groupId: group.id,
        sessionId: session.id,
      },
    },
    select: { id: true },
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
