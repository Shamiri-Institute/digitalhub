import { objectId } from "#/lib/crypto";
import useS3Upload from "#/lib/hooks/use-s3-upload";
import { appendToPdf, imagesToPdf } from "#/lib/utils/pdf";
import { buildS3Key, sanitizeForS3Key } from "#/lib/utils/s3-key-builder";
import { ApiResponse } from "#/types/api.types";
import { getAttendanceDocument } from ".";
import { AttendanceDocS3Key, StudentAttendanceDocsFilters } from "./types";

export async function uploadAttendanceDocument(
  filters: StudentAttendanceDocsFilters,
  files: File[],
  s3KeyFields:AttendanceDocS3Key
) {
  try {

    const attendancePdf = createAttendancePdf(filters, files)
    if (!attendancePdf) throw new Error(`No attendance pdf was generated`);

    const { s3Key, fileName } = buildAttendanceS3Key(s3KeyFields);

    const {} = useS3Upload()


  } catch (error:any) {

    const response: ApiResponse = {
      success: false,
      message:`${error.message}`
    }

    return response;
  }
}

export async function createAttendancePdf(filters:StudentAttendanceDocsFilters, files:File[]):Promise<File> {

  const existing = await getAttendanceDocument(filters);

  if (!existing) throw new Error(`No attendance document was found`);

  let pdfBlob: Blob;
  if (existing.presignedUrl) {
    const response = await fetch(existing.presignedUrl);
    const existingPdfBytes = await response.arrayBuffer();
    pdfBlob = await appendToPdf(existingPdfBytes, files);
  } else {
    pdfBlob = await imagesToPdf(files);
  }

  const pdfFile = new File([pdfBlob], "attendance.pdf", { type: "application/pdf" });

  return pdfFile
}

function buildAttendanceS3Key(fields: AttendanceDocS3Key):{
  fileName: string,
  s3Key:string
}{

  const { schoolName, fellowName, groupName, sessionDate, sessionType, groupId, sessionId } = fields;

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
