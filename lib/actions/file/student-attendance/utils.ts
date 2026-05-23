import { objectId } from "#/lib/crypto";
import { appendToPdf, imagesToPdf } from "#/lib/utils/pdf";
import { buildS3Key, sanitizeForS3Key } from "#/lib/utils/s3-key-builder";
import type { AttendanceDocS3Key } from "./types";

export async function createAttendancePdf(fileUrl: string | null, files: File[]): Promise<File> {
  let pdfBlob: Blob;
  if (fileUrl) {
    const res = await fetch(fileUrl);
    pdfBlob = await appendToPdf(await res.arrayBuffer(), files);
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

  const docId = objectId("att_doc");
  const extension = "pdf";

  const dateStr = sessionDate.toISOString().split("T")[0]?.replace(/-/g, "_") ?? "";

  const sanitizedSession = sanitizeForS3Key(sessionType).toUpperCase();
  const sanitizedDate = dateStr;
  const sanitizedGroup = sanitizeForS3Key(groupName).toUpperCase();
  const sanitizedName = sanitizeForS3Key(fellowName).toUpperCase();

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
