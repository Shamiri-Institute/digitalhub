import { type RecordingsS3KeyParams, RecordingsS3KeySchema } from "#/lib/s3/s3.types";
import { buildStorageKey } from "#/lib/s3/utils/build-storage-key";
import { sanitizeS3Key } from "#/lib/s3/utils/sanitize-s3-key";

export function buildRecordingsS3Key(params: RecordingsS3KeyParams): string {
  const {
    schoolName,
    fellowName,
    groupName,
    sessionType,
    recordingId,
    extension,
    prefix = "recordings",
    customFileName,
  } = RecordingsS3KeySchema.parse(params);

  const now = new Date();
  const year = now.getFullYear().toString();
  const month = String(now.getMonth() + 1).padStart(2, "0");

  const cleanExtension = extension.replace(/^\./, "").toLowerCase();
  const baseName = customFileName ?? `${sessionType}_${recordingId}`;

  return buildStorageKey({
    segments: [prefix, year, month, schoolName, fellowName, groupName],
    fileName: `${baseName}.${cleanExtension}`,
  });
}

export function generateRecordingFilename(
  sessionType: string,
  recordingId: string,
  extension: string,
): string {
  const sanitizedSession = sanitizeS3Key(sessionType);
  const cleanExtension = extension.replace(/^\./, "").toLowerCase();
  return `${sanitizedSession}_${recordingId}.${cleanExtension}`;
}
