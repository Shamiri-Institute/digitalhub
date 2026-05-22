"use server";

import { ImplementerRole } from "@prisma/client";
import { getCurrentUserSession } from "#/app/auth";
import { db } from "#/lib/db";
import { deleteObject, getPresignedUrl } from "#/lib/s3";
import { StudentAttendanceDocsFilters } from "./types";

export interface CreateStudentAttendanceDocPayload {
  fileName: string;
  groupId: string;
  sessionId: string;
  link: string;
}

export async function createStudentAttendanceDocument(payload: CreateStudentAttendanceDocPayload) {
  try {
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

    return {
      success: true,
      message: "Successfully uploaded the document.",
    };
  } catch (error) {
    console.error(error);
    return {
      error: "Something went wrong uploading the document",
      success: false,
    };
  }
}

export async function getAttendanceDocument(filters:StudentAttendanceDocsFilters) {
  try {

    const { sessionId, groupId } = filters;
    const session = await getCurrentUserSession();

    if (!session?.user.id || session.user.activeMembership?.role !== ImplementerRole.FELLOW) {
      return { success: false, error: "Unauthorized" };
    }

    const doc = await db.attendanceDocuments.findFirst({
      where: { sessionId, groupId, archivedAt: null },
      orderBy: { createdAt: "desc" },
    });

    if (!doc) {
      return { success: false, error: "No attendance document found for this session" };
    }

    const bucket = doc.link.startsWith("student-attendance/")
      ? ("student-attendance" as const)
      : ("uploads" as const);

    const presignedUrl = await getPresignedUrl(doc.link, bucket);

    return {
      success: true,
      data: {
        id: doc.id,
        fileName: doc.fileName,
        link: doc.link,
        presignedUrl,
        createdAt: doc.createdAt,
      },
    };
  } catch (error) {
    console.error(error);
    return { success: false, error: "Failed to load attendance document" };
  }
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

export async function unarchiveAttendanceDocument(documentId: string) {
  try {
    const session = await getCurrentUserSession();

    if (!session?.user.id || session.user.activeMembership?.role !== ImplementerRole.FELLOW) {
      throw new Error("The session has not been authenticated");
    }

    await db.attendanceDocuments.update({
      where: { id: documentId },
      data: { archivedAt: null },
    });

    return {
      success: true,
      message: "Successfully unarchived the attendance document.",
    };
  } catch (error) {
    console.error(error);
    return {
      success: false,
      error: "Something went wrong unarchiving the attendance document",
    };
  }
}
