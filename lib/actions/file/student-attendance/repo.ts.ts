"use server";

import { ImplementerRole } from "@prisma/client";
import { getCurrentUserSession } from "#/app/auth";
import { db } from "#/lib/db";
import { deleteObject, getPresignedUrl } from "#/lib/s3";
import { AttendanceDoc, CreateStudentAttendanceDocPayload, StudentAttendanceDocsFilters } from "./types";



export async function createStudentAttendanceDocument(payload: CreateStudentAttendanceDocPayload) {
  const session = await getCurrentUserSession();

  if (!session?.user.id || session.user.activeMembership?.role !== ImplementerRole.FELLOW) {
    throw new Error("The session has not been authenticated");
  }

  const userId = session.user.id;
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
      data: {
        ...payload,
        uploadedBy: userId,
      },
    });
  });

}

export async function getAttendanceDocument(filters:StudentAttendanceDocsFilters):Promise<AttendanceDoc> {

  const { sessionId, groupId } = filters;
  const session = await getCurrentUserSession();

  if (!session?.user.id || session.user.activeMembership?.role !== ImplementerRole.FELLOW) {
    throw new Error(`user is unauthorized`)
  }

  const doc = await db.attendanceDocuments.findFirst({
    where: { sessionId, groupId, archivedAt: null },
    orderBy: { createdAt: "desc" },
  });

  if (!doc) throw new Error(`No attendance document was found`)

  const bucket = doc.link.startsWith("student-attendance/")
    ? ("student-attendance" as const)
    : ("uploads" as const);

  const presignedUrl = await getPresignedUrl(doc.link, bucket);

  const document: AttendanceDoc = {
    id: doc.id,
    fileName: doc.fileName,
    link: doc.link,
    presignedUrl,
    createdAt: doc.createdAt,
  }

  return document;

}

export async function deleteAttendanceFile(key: string) {
  try {
    const session = await getCurrentUserSession();

    if (!session?.user.id || session.user.activeMembership?.role !== ImplementerRole.FELLOW) {
      throw new Error("The session has not been authenticated");
    }

    const bucket = key.startsWith("student-attendance/")
      ? ("student-attendance" as const)
      : ("uploads" as const);

    await deleteObject({ Key: key }, bucket);

    return {
      success: true,
      message: "Successfully deleted the attendance file.",
    };
  } catch (error) {
    console.error(error);
    return {
      success: false,
      error: "Something went wrong deleting the attendance file",
    };
  }
}

export async function archiveAttendanceDocument(documentId: string) {
  try {
    const session = await getCurrentUserSession();

    if (!session?.user.id || session.user.activeMembership?.role !== ImplementerRole.FELLOW) {
      throw new Error("The session has not been authenticated");
    }

    await db.attendanceDocuments.update({
      where: { id: documentId },
      data: { archivedAt: new Date() },
    });

    return {
      success: true,
      message: "Successfully archived the attendance document.",
    };
  } catch (error) {
    console.error(error);
    return {
      success: false,
      error: "Something went wrong archiving the attendance document",
    };
  }
}
