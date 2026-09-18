import { type AttendanceS3KeyParams, AttendanceS3KeySchema } from "#/lib/s3/s3.types";
import { buildStorageKey } from "#/lib/s3/utils/build-storage-key";
import { sanitizeS3Key } from "#/lib/s3/utils/sanitize-s3-key";

export function buildAttendanceS3Key(fields: AttendanceS3KeyParams): {
  fileName: string;
  s3Key: string;
} {
  const { schoolName, fellowName, groupName, sessionDate, sessionType } =
    AttendanceS3KeySchema.parse(fields);

  const now = new Date();
  const year = now.getFullYear().toString();
  const month = String(now.getMonth() + 1).padStart(2, "0");

  const dateStr = sessionDate.toISOString().split("T")[0]?.replace(/-/g, "_") ?? "";
  const fileName = [
    sanitizeS3Key(sessionType),
    dateStr,
    sanitizeS3Key(groupName),
    sanitizeS3Key(fellowName),
  ]
    .filter(Boolean)
    .join("_");

  const s3Key = buildStorageKey({
    segments: ["student-attendance", year, month, schoolName, fellowName, groupName],
    fileName: `${fileName}.pdf`,
  });

  return { fileName, s3Key };
}
