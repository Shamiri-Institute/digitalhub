import { db } from "#/lib/db";
import { getPresignedUrl } from "#/lib/s3";
import { AttendanceDoc, CreateStudentAttendanceDocPayload, StudentAttendanceDocsFilters } from "./types";

export async function createStudentAttendanceDocument(
  payload: CreateStudentAttendanceDocPayload,
  userId: string,
): Promise<void> {
  await db.$transaction(async (tx) => {
    await tx.attendanceDocuments.updateMany({
      where: {
        sessionId: payload.sessionId,
        groupId: payload.groupId,
        archivedAt: null,
      },
      data: { archivedAt: new Date() },
    });

    await tx.attendanceDocuments.create({
      data: { ...payload, uploadedBy: userId },
    });
  });
}

export async function getAttendanceDocument(
  filters: StudentAttendanceDocsFilters,
): Promise<AttendanceDoc> {
  const { sessionId, groupId } = filters;

  const doc = await db.attendanceDocuments.findFirst({
    where: { sessionId, groupId, archivedAt: null },
    orderBy: { createdAt: "desc" },
  });

  if (!doc) throw new Error("No attendance document was found");

  const bucket = doc.link.startsWith("student-attendance/")
    ? ("student-attendance" as const)
    : ("uploads" as const);

  const presignedUrl = await getPresignedUrl(doc.link, bucket);

  return {
    id: doc.id,
    fileName: doc.fileName,
    link: doc.link,
    presignedUrl,
    createdAt: doc.createdAt,
  };
}

export async function archiveDocument(documentId: string): Promise<void> {
  await db.attendanceDocuments.update({
    where: { id: documentId },
    data: { archivedAt: new Date() },
  });
}
