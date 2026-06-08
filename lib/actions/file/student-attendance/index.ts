"use server";

import { ImplementerRole } from "@prisma/client";
import { getCurrentUserSession } from "#/app/auth";
import { db } from "#/lib/db";
import { deleteObject, getPresignedUrl } from "#/lib/s3";
import type { ActionResponse } from "#/types/actions.types";
import type {
  AttendanceDoc,
  CreateStudentAttendanceDocPayload,
  StudentAttendanceDocsFilters,
} from "./types";

export type {
  AttendanceDoc,
  AttendanceDocS3Key,
  CreateStudentAttendanceDocPayload,
  StudentAttendanceDocsFilters,
} from "./types";

export async function getAttendanceDocument(
  filters: StudentAttendanceDocsFilters,
): Promise<ActionResponse<AttendanceDoc>> {
  try {
    const session = await getCurrentUserSession();
    if (
      !session?.user.id ||
      (session.user.activeMembership?.role !== ImplementerRole.FELLOW &&
        session.user.activeMembership?.role !== ImplementerRole.SUPERVISOR &&
        session.user.activeMembership?.role !== ImplementerRole.HUB_COORDINATOR &&
        session.user.activeMembership?.role !== ImplementerRole.ADMIN)
    )
      throw new Error("The session has not been authenticated");

    const { sessionId, groupId } = filters;

    const doc = await db.attendanceDocuments.findFirst({
      where: { sessionId, groupId, archivedAt: null },
      orderBy: { createdAt: "desc" },
    });

    if (!doc) throw new Error("No attendance document found for this session");

    const bucket = doc.link.startsWith("student-attendance/")
      ? ("student-attendance" as const)
      : ("uploads" as const);

    const presignedUrl = await getPresignedUrl(doc.link, bucket);

    const data: AttendanceDoc = {
      id: doc.id,
      fileName: doc.fileName,
      link: doc.link,
      presignedUrl,
      createdAt: doc.createdAt,
    };

    const response: ActionResponse<AttendanceDoc> = {
      success: true,
      data,
      message: "Successfully fetched attendance document",
    };
    return response;
  } catch (error: unknown) {
    const response: ActionResponse<AttendanceDoc> = {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error",
    };
    return response;
  }
}

export async function createAttendanceDocument(
  payload: CreateStudentAttendanceDocPayload,
  oldS3Key: string | null,
): Promise<ActionResponse> {
  try {
    const session = await getCurrentUserSession();
    if (!session) throw new Error("The session has not been authenticated");
    if (!session.user.id || session.user.activeMembership?.role !== ImplementerRole.FELLOW)
      throw new Error("The session has not been authenticated");

    if (!payload.groupId || !payload.sessionId)
      throw new Error("No groupId or sessionId was provided");

    const userId = session.user.id;

    const markedStudentCount = await db.studentAttendance.count({
      where: {
        sessionId: payload.sessionId,
        groupId: payload.groupId,
      },
    });

    if (markedStudentCount < 2) {
      throw new Error("At least 2 students must have attendance marked before uploading");
    }

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

    if (oldS3Key) {
      const bucket = oldS3Key.startsWith("student-attendance/")
        ? ("student-attendance" as const)
        : ("uploads" as const);
      await deleteObject({ Key: oldS3Key }, bucket);
    }

    return { success: true, message: "Successfully created attendance document" };
  } catch (error: unknown) {
    return { success: false, message: error instanceof Error ? error.message : "Unknown error" };
  }
}

export async function deleteAttendanceFile(
  documentId: string,
  key: string,
): Promise<ActionResponse> {
  try {
    const session = await getCurrentUserSession();
    if (!session?.user.id || session.user.activeMembership?.role !== ImplementerRole.FELLOW)
      throw new Error("The session has not been authenticated");

    await db.attendanceDocuments.update({
      where: { id: documentId },
      data: { archivedAt: new Date() },
    });

    const bucket = key.startsWith("student-attendance/")
      ? ("student-attendance" as const)
      : ("uploads" as const);

    await deleteObject({ Key: key }, bucket);
    const response: ActionResponse = {
      success: true,
      message: "Successfully deleted the attendance file.",
    };
    return response;
  } catch (error: unknown) {
    console.error(error);
    const response: ActionResponse = {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Something went wrong deleting the attendance file",
    };
    return response;
  }
}
