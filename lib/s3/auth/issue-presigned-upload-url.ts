import "server-only";

import { db } from "#/lib/db";
import { getPresignedUploadUrl } from "../s3.service";
import { type IssuedUpload, type S3ApiRequest, UPLOAD_PERMIT_TTL_SECONDS } from "../s3.types";
import { authorizeAttendanceUpload } from "./authorize-attendance-upload";
import { authorizeRecordingUpload } from "./authorize-recording-upload";

export async function issuePresignedUploadUrl(params: S3ApiRequest): Promise<IssuedUpload> {
  const { bucket, contentType, size, uploaderId } = params;

  const target =
    bucket === "recordings"
      ? await authorizeRecordingUpload(params)
      : await authorizeAttendanceUpload(params);

  await db.s3UploadPermit.create({
    data: {
      bucket,
      key: target.key,
      contentType,
      size,
      context: target.context,
      issuedTo: uploaderId,
      expiresAt: new Date(Date.now() + UPLOAD_PERMIT_TTL_SECONDS * 1000),
    },
  });

  const { url, bucket: s3Bucket } = await getPresignedUploadUrl(target.key, bucket, contentType, {
    contentLength: size,
    expiresIn: UPLOAD_PERMIT_TTL_SECONDS,
  });

  if (target.bucket === "recordings") {
    return {
      bucket: target.bucket,
      url,
      key: target.key,
      s3Bucket,
      fileName: target.fileName,
      recordingId: target.recordingId,
    };
  }

  return {
    bucket: target.bucket,
    url,
    key: target.key,
    s3Bucket,
    fileName: target.fileName,
  };
}
