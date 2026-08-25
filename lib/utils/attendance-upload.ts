import { objectId } from "#/lib/crypto";
import { appendToPdf, imagesToPdf } from "#/lib/utils/pdf/images-to-pdf";
import { buildS3Key, sanitizeForS3Key } from "#/lib/utils/s3-key-builder";
import type { AttendanceDocS3Key } from "../actions/file/student-attendance/types";

export async function createAttendancePdf(fileUrl: string | null, files: File[]): Promise<File> {
  let pdfBlob: Blob;
  if (fileUrl) {
    const res = await fetch(fileUrl);
    if (!res.ok) {
      pdfBlob = await imagesToPdf(files);
    } else {
      pdfBlob = await appendToPdf(await res.arrayBuffer(), files);
    }
  } else {
    pdfBlob = await imagesToPdf(files);
  }
  const pdfFile = new File([pdfBlob], "attendance.pdf", { type: "application/pdf" });

  return pdfFile;
}

export function buildAttendanceS3Key(fields: AttendanceDocS3Key): {
  fileName: string;
  s3Key: string;
} {
  const { schoolName, fellowName, groupName, sessionDate, sessionType } = fields;

  const docId = objectId("");
  const extension = "pdf";

  const dateStr = sessionDate.toISOString().split("T")[0]?.replace(/-/g, "_") ?? "";

  const sanitizedSession = sanitizeAttendanceKey(sessionType);
  const sanitizedDate = dateStr;
  const sanitizedGroup = sanitizeAttendanceKey(groupName);
  const sanitizedName = sanitizeAttendanceKey(fellowName);

  const customFileName = `${sanitizedSession}_${sanitizedDate}_${sanitizedGroup}_${sanitizedName}_${docId}`;

  const s3Key = buildS3Key({
    schoolName: schoolName as string,
    fellowName: fellowName as string,
    groupName: groupName as string,
    sessionType: sessionType as string,
    recordingId: docId,
    extension,
    prefix: "student-attendance",
    customFileName,
  });

  return { fileName: customFileName, s3Key };
}

// Same rules as sanitizeForS3Key, but uppercase and with hyphens folded into underscores.
function sanitizeAttendanceKey(name: string): string {
  return sanitizeForS3Key(name.replace(/-/g, " ")).toUpperCase();
}
