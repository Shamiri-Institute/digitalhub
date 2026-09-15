"use server";

import { ImplementerRole, Prisma } from "@prisma/client";
import { getCurrentUserSession } from "#/app/auth";
import { db } from "#/lib/db";
import { deleteObject, getPresignedUrl, headObject } from "#/lib/s3/s3.service";
import { verifyUploadToken } from "#/lib/s3/utils/upload-token";
import type { ActionResponse } from "#/types/actions.types";
import {
  type AttendanceDoc,
  type CreateStudentAttendanceDocPayload,
  NO_ATTENDANCE_DOCUMENT_MESSAGE,
  type StudentAttendanceDocsFilters,
} from "./types";

export type { AttendanceS3KeyParams } from "#/lib/s3/s3.types";
export type {
  AttendanceDoc,
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
    if (!sessionId?.trim() || !groupId?.trim())
      throw new Error("A sessionId and groupId are required");

    const role = session.user.activeMembership?.role;
    const identifier = session.user.activeMembership?.identifier;

    const group = await db.interventionGroup.findFirst({
      where: { id: groupId },
      select: {
        leaderId: true,
        school: {
          select: {
            hub: {
              select: {
                supervisors: { select: { id: true } },
                coordinators: { select: { id: true } },
              },
            },
          },
        },
      },
    });

    const hub = group?.school?.hub;
    const inScope =
      role === ImplementerRole.ADMIN ||
      (Boolean(identifier) &&
        ((role === ImplementerRole.FELLOW && group?.leaderId === identifier) ||
          (role === ImplementerRole.SUPERVISOR &&
            (hub?.supervisors.some((s) => s.id === identifier) ?? false)) ||
          (role === ImplementerRole.HUB_COORDINATOR &&
            (hub?.coordinators.some((c) => c.id === identifier) ?? false))));

    if (!group || !inScope) throw new Error("Forbidden");

    const doc = await db.attendanceDocuments.findFirst({
      where: { sessionId, groupId, archivedAt: null },
      orderBy: { createdAt: "desc" },
    });

    if (!doc) throw new Error(NO_ATTENDANCE_DOCUMENT_MESSAGE);

    const presignedUrl = await getPresignedUrl(doc.link, "student-attendance");

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

async function discardOrphanedAttendanceUpload(link: string): Promise<void> {
  await deleteObject({ Key: link }, "student-attendance").catch((error) => {
    console.error("Failed to delete orphaned attendance upload:", link, error);
  });
}

export async function createAttendanceDocument(
  payload: CreateStudentAttendanceDocPayload,
): Promise<ActionResponse> {
  try {
    const session = await getCurrentUserSession();
    if (!session) throw new Error("The session has not been authenticated");
    if (!session.user.id || session.user.activeMembership?.role !== ImplementerRole.FELLOW)
      throw new Error("The session has not been authenticated");

    if (!payload.groupId || !payload.sessionId)
      throw new Error("No groupId or sessionId was provided");

    const userId = session.user.id;

    let claim: ReturnType<typeof verifyUploadToken>;
    try {
      claim = verifyUploadToken(payload.token);
    } catch {
      throw new Error("Upload not authorized");
    }

    if (
      claim.bucket !== "student-attendance" ||
      claim.uploaderId !== userId ||
      claim.key !== payload.link
    ) {
      throw new Error("Upload not authorized");
    }

    const ctx = claim.context;
    if (ctx.groupId !== payload.groupId || ctx.sessionId !== payload.sessionId) {
      await discardOrphanedAttendanceUpload(payload.link);
      throw new Error("Upload does not match authorized scope");
    }

    const markedStudentCount = await db.studentAttendance.count({
      where: {
        sessionId: payload.sessionId,
        groupId: payload.groupId,
      },
    });

    if (markedStudentCount < 2) {
      await discardOrphanedAttendanceUpload(payload.link);
      throw new Error("At least 2 students must have attendance marked before uploading");
    }

    try {
      await headObject(payload.link, "student-attendance");
    } catch {
      throw new Error("Uploaded file not found");
    }

    const { token: _token, ...docData } = payload;

    const supersededLinks: string[] = [];

    try {
      await db.$transaction(
        async (tx) => {
          const active = await tx.attendanceDocuments.findMany({
            where: {
              sessionId: payload.sessionId,
              groupId: payload.groupId,
              archivedAt: null,
            },
            select: { link: true },
          });
          for (const doc of active) supersededLinks.push(doc.link);

          await tx.attendanceDocuments.updateMany({
            where: {
              sessionId: payload.sessionId,
              groupId: payload.groupId,
              archivedAt: null,
            },
            data: { archivedAt: new Date() },
          });

          await tx.attendanceDocuments.create({
            data: { ...docData, fileName: claim.fileName, uploadedBy: userId },
          });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (txError) {
      await discardOrphanedAttendanceUpload(payload.link);
      throw txError;
    }

    await Promise.all(
      supersededLinks
        .filter((link) => Boolean(link) && link !== payload.link)
        .map((link) =>
          deleteObject({ Key: link }, "student-attendance").catch((error) => {
            console.error("Failed to delete superseded attendance file:", link, error);
          }),
        ),
    );

    return {
      success: true,
      message: "Successfully created attendance document",
    };
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
      return {
        success: false,
        message: "Another upload for this session is in progress. Please try again.",
      };
    }
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function deleteAttendanceFile(documentId: string): Promise<ActionResponse> {
  try {
    const session = await getCurrentUserSession();
    if (!session?.user.id || session.user.activeMembership?.role !== ImplementerRole.FELLOW)
      throw new Error("The session has not been authenticated");

    const fellowId = session.user.activeMembership?.identifier;
    if (!fellowId) throw new Error("Forbidden");

    const doc = await db.attendanceDocuments.findFirst({
      where: { id: documentId, group: { leaderId: fellowId } },
      select: { id: true, link: true },
    });
    if (!doc) throw new Error("Forbidden");

    await db.attendanceDocuments.update({
      where: { id: doc.id },
      data: { archivedAt: new Date() },
    });

    if (doc.link) {
      await deleteObject({ Key: doc.link }, "student-attendance");
    }
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
