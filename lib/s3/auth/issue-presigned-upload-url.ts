import "server-only";

import { getPresignedUploadUrl } from "../s3.service";
import { type IssuedUpload, PRESIGNED_UPLOAD_TTL_SECONDS, type S3ApiRequest } from "../s3.types";
import { signUploadToken, type UploadClaim } from "../utils/upload-token";
import { authorizeAttendanceUpload } from "./authorize-attendance-upload";
import { authorizeRecordingUpload } from "./authorize-recording-upload";

export async function issuePresignedUploadUrl(params: S3ApiRequest): Promise<IssuedUpload> {
  const { bucket, size, uploaderId } = params;

  const target =
    bucket === "recordings"
      ? await authorizeRecordingUpload(params)
      : await authorizeAttendanceUpload(params);

  const { url, bucket: s3Bucket } = await getPresignedUploadUrl(
    target.key,
    bucket,
    target.contentType,
    {
      contentLength: size,
      expiresIn: PRESIGNED_UPLOAD_TTL_SECONDS,
    },
  );

  const token = signUploadToken({
    bucket: target.bucket,
    key: target.key,
    uploaderId,
    contentType: target.contentType,
    fileName: target.fileName,
    context: target.context,
  } as UploadClaim);

  const issued = {
    url,
    key: target.key,
    s3Bucket,
    fileName: target.fileName,
    token,
  };

  if (target.bucket === "recordings") {
    return { bucket: target.bucket, ...issued, recordingId: target.recordingId };
  }

  return { bucket: target.bucket, ...issued };
}
