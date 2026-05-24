"use server";

import { ImplementerRole } from "@prisma/client";
import { getCurrentUserSession } from "#/app/auth";
import { deleteObject } from "#/lib/s3";
import type { ActionResponse } from "#/types/actions.types";
import {
  archiveDocument,
  createStudentAttendanceDocument,
  getAttendanceDocument as getAttendanceDocumentFromRepo,
} from "./repo";
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
    if (!session?.user.id || session.user.activeMembership?.role !== ImplementerRole.FELLOW)
      throw new Error("The session has not been authenticated");

    const data = await getAttendanceDocumentFromRepo(filters);
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
    if (!session?.user.id || session.user.activeMembership?.role !== ImplementerRole.FELLOW)
      throw new Error("The session has not been authenticated");

    if (!payload.groupId || !payload.sessionId)
      throw new Error("No groupId or sessionId was provided");

    await createStudentAttendanceDocument(payload, session.user.id);

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

    await archiveDocument(documentId);

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
