"use server";

import { Prisma } from "@prisma/client";
import { ImplementerRole } from "#/db/enums";
import { getCurrentUserSession } from "#/app/auth";
import { db } from "#/lib/db";
import { deleteObject, getPresignedUrl } from "#/lib/s3/s3.service";
import {
  discardOrphanedUpload,
  verifyUploadClaim,
  verifyUploadedObject,
} from "#/lib/s3/utils/verify-upload";
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

class StaleAttendanceUploadError extends Error {
  constructor() {
    super("This attendance document was updated by someone else. Please reload and try again.");
    this.name = "StaleAttendanceUploadError";
  }
}

function buildAttendanceScopeFilter(
  role: ImplementerRole | undefined,
  identifier: string | null | undefined,
): Prisma.InterventionGroupWhereInput | null {
  if (role === ImplementerRole.ADMIN) return {};
  if (!identifier) return null;

  switch (role) {
    case ImplementerRole.FELLOW:
      return { leaderId: identifier };
    case ImplementerRole.SUPERVISOR:
      return {
        OR: [
          { leader: { supervisorId: identifier } },
          { school: { assignedSupervisorId: identifier } },
        ],
      };
    case ImplementerRole.HUB_COORDINATOR:
      return { school: { hub: { coordinators: { some: { id: identifier } } } } };
    default:
      return null;
  }
}

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

    if (role !== ImplementerRole.ADMIN && !identifier) throw new Error("Forbidden");

    const scopeFilter = buildAttendanceScopeFilter(role, identifier);
    if (!scopeFilter) throw new Error("Forbidden");

    const group = await db.interventionGroup.findFirst({
      where: { id: groupId, ...scopeFilter },
      select: { id: true },
    });

    if (!group) throw new Error("Forbidden");

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

    const claim = verifyUploadClaim(payload.token, {
      bucket: "student-attendance",
      uploaderId: userId,
      key: payload.link,
    });
    if (claim?.bucket !== "student-attendance") {
      throw new Error("Upload not authorized");
    }

    const ctx = claim.context;
    if (ctx.groupId !== payload.groupId || ctx.sessionId !== payload.sessionId) {
      await discardOrphanedUpload(payload.link, "student-attendance");
      throw new Error("Upload does not match authorized scope");
    }

    const markedStudentCount = await db.studentAttendance.count({
      where: {
        sessionId: payload.sessionId,
        groupId: payload.groupId,
      },
    });

    if (markedStudentCount < 2) {
      await discardOrphanedUpload(payload.link, "student-attendance");
      throw new Error("At least 2 students must have attendance marked before uploading");
    }

    const verified = await verifyUploadedObject(payload.link, "student-attendance");
    if (verified.status === "not-found") {
      throw new Error("Uploaded file not found");
    }
    if (verified.status === "error") {
      throw new Error("Could not verify the uploaded file. Please try again.");
    }

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
            select: { id: true, link: true },
            orderBy: { createdAt: "desc" },
          });

          const currentActiveId = active[0]?.id ?? null;
          if (currentActiveId !== payload.expectedActiveDocId) {
            throw new StaleAttendanceUploadError();
          }

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
            data: {
              groupId: payload.groupId,
              sessionId: payload.sessionId,
              link: claim.key,
              fileName: claim.fileName,
              uploadedBy: userId,
            },
          });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (txError) {
      const stillReferenced = await db.attendanceDocuments.count({
        where: { link: payload.link },
      });
      if (stillReferenced === 0) {
        await discardOrphanedUpload(payload.link, "student-attendance");
      }
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
    if (error instanceof StaleAttendanceUploadError) {
      return { success: false, message: error.message };
    }
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
