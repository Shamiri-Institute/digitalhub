"use server";

import { ImplementerRole } from "@prisma/client";
import { getCurrentUserSession } from "#/app/auth";
import { deleteObject } from "#/lib/s3";
import type { ApiResponse } from "#/types/api.types";
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

export async function getAttendanceDocument(
  filters: StudentAttendanceDocsFilters,
): Promise<ApiResponse<AttendanceDoc>> {
  try {
    const session = await getCurrentUserSession();
    if (!session?.user.id || session.user.activeMembership?.role !== ImplementerRole.FELLOW)
      throw new Error("The session has not been authenticated");

    const data = await getAttendanceDocumentFromRepo(filters);
    const response: ApiResponse<AttendanceDoc> = {
      success: true,
      data,
      message: "Successfully fetched attendance document",
    };
    return response;
  } catch (error: any) {
    const response: ApiResponse = { success: false, message: error.message };
    return response;
  }
}

export async function createAttendanceDocument(
  payload: CreateStudentAttendanceDocPayload,
  oldS3Key: string | null,
): Promise<ApiResponse> {
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
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function deleteAttendanceFile(documentId: string, key: string): Promise<ApiResponse> {
  try {
    const session = await getCurrentUserSession();
    if (!session?.user.id || session.user.activeMembership?.role !== ImplementerRole.FELLOW)
      throw new Error("The session has not been authenticated");

    await archiveDocument(documentId);

    const bucket = key.startsWith("student-attendance/")
      ? ("student-attendance" as const)
      : ("uploads" as const);

    await deleteObject({ Key: key }, bucket);
    const response: ApiResponse = {
      success: true,
      message: "Successfully deleted the attendance file.",
    };
    return response;
  } catch (error: any) {
    console.error(error);
    const response: ApiResponse = {
      success: false,
      message: "Something went wrong deleting the attendance file",
    };
    return response;
  }
}
