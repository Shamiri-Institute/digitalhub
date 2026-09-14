import "server-only";

import { ImplementerRole } from "@prisma/client";
import { MAX_FILE_SIZE } from "#/app/(platform)/sc/reporting/recordings/schemas";
import { currentFellow } from "#/app/auth";
import { requireAuthRole } from "#/lib/auth/require-auth-role";
import { db } from "#/lib/db";
import { buildAttendanceS3Key } from "#/lib/s3/key-builders/build-attendance-s3-key";
import { UploadAuthorizationError } from "#/lib/s3/s3.errors";
import type { S3AuthParams, UploadTarget } from "#/lib/s3/s3.types";
import { normalizeContentType } from "#/lib/s3/utils/normalize-content-type";

export async function authorizeAttendanceUpload(
  params: S3AuthParams,
): Promise<Extract<UploadTarget, { bucket: "student-attendance" }>> {
  await requireAuthRole(ImplementerRole.FELLOW).catch(() => {
    throw new UploadAuthorizationError("Forbidden");
  });

  const fellow = await currentFellow();
  if (!fellow?.profile?.id) throw new UploadAuthorizationError("Forbidden");
  const { profile } = fellow;

  if (normalizeContentType(params.contentType) !== "application/pdf")
    throw new UploadAuthorizationError("Unsupported content type");
  if (params.size > MAX_FILE_SIZE) throw new UploadAuthorizationError("File too large");

  const group = await db.interventionGroup.findFirst({
    where: { id: params.groupId, leaderId: profile.id },
    select: {
      id: true,
      groupName: true,
      schoolId: true,
      school: { select: { schoolName: true } },
    },
  });
  if (!group) throw new UploadAuthorizationError("Forbidden");

  const session = await db.interventionSession.findFirst({
    where: { id: params.sessionId, schoolId: group.schoolId, occurred: true },
    select: { id: true, sessionType: true, sessionDate: true },
  });
  if (!session) throw new UploadAuthorizationError("Forbidden");

  const { fileName, s3Key: key } = buildAttendanceS3Key({
    schoolName: group.school.schoolName,
    fellowName: profile.fellowName ?? "unknown",
    groupName: group.groupName,
    sessionDate: session.sessionDate,
    sessionType: session.sessionType ?? "session",
  });

  return {
    bucket: "student-attendance",
    key,
    fileName,
    context: {
      groupId: group.id,
      sessionId: session.id,
      fellowId: profile.id,
    },
  };
}
