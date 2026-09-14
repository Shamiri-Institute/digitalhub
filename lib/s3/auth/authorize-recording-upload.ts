import "server-only";

import { ImplementerRole } from "@prisma/client";
import {
  MAX_FILE_SIZE,
  RECORDINGS_ALLOWED_CONTENT_TYPES,
} from "#/app/(platform)/sc/reporting/recordings/schemas";
import { currentSupervisorLite } from "#/app/auth";
import { requireAuthRole } from "#/lib/auth/require-auth-role";
import { objectId } from "#/lib/crypto";
import { db } from "#/lib/db";
import {
  buildRecordingsS3Key,
  generateRecordingFilename,
} from "#/lib/s3/key-builders/build-recordings-s3-key";
import { UploadAuthorizationError } from "#/lib/s3/s3.errors";
import type { S3AuthParams, UploadTarget } from "#/lib/s3/s3.types";
import { normalizeContentType } from "#/lib/s3/utils/normalize-content-type";

export async function authorizeRecordingUpload(
  params: S3AuthParams,
): Promise<Extract<UploadTarget, { bucket: "recordings" }>> {
  await requireAuthRole(ImplementerRole.SUPERVISOR).catch(() => {
    throw new UploadAuthorizationError("Forbidden");
  });

  const supervisor = await currentSupervisorLite();
  if (!supervisor?.profile?.id) throw new UploadAuthorizationError("Forbidden");

  const normalized = normalizeContentType(params.contentType);
  const extension =
    RECORDINGS_ALLOWED_CONTENT_TYPES[
      normalized as keyof typeof RECORDINGS_ALLOWED_CONTENT_TYPES
    ]?.[0];
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
  if (!group) throw new UploadAuthorizationError("Forbidden");

  const fellow = group.leader;

  const session = await db.interventionSession.findFirst({
    where: { id: params.sessionId, schoolId: group.schoolId, occurred: true },
    select: { id: true, sessionType: true },
  });
  if (!session) throw new UploadAuthorizationError("Forbidden");

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
  if (existing) throw new UploadAuthorizationError("A recording already exists for this session");

  const recordingId = objectId("rec");
  const sessionType = session.sessionType ?? "session";
  const fileName = generateRecordingFilename(sessionType, recordingId, extension);
  const key = buildRecordingsS3Key({
    schoolName: group.school.schoolName,
    fellowName: fellow.fellowName ?? "unknown",
    groupName: group.groupName,
    sessionType,
    recordingId,
    extension,
  });

  return {
    bucket: "recordings",
    key,
    recordingId,
    fileName,
    context: {
      recordingId,
      fellowId: fellow.id,
      groupId: group.id,
      sessionId: session.id,
      schoolId: group.schoolId,
    },
  };
}
