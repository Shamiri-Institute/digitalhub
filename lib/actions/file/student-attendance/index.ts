"use server";

import { ImplementerRole } from "@prisma/client";
import { getCurrentUserSession } from "#/app/auth";
import { db } from "#/lib/db";
import { deleteObject, getPresignedUrl } from "#/lib/s3/s3.service";
import type { ActionResponse } from "#/types/actions.types";
import type {
  AttendanceDoc,
  CreateStudentAttendanceDocPayload,
  StudentAttendanceDocsFilters,
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
    const role = session.user.activeMembership?.role;
    const identifier = session.user.activeMembership?.identifier;

    const group = await db.interventionGroup.findFirst({
      where: { id: groupId },
      select: {
        leaderId: true,
        school: {
          select: {
            assignedSupervisorId: true,
            hub: { select: { coordinators: { select: { id: true } } } },
          },
        },
      },
    });

    const inScope =
      role === ImplementerRole.ADMIN ||
      (Boolean(identifier) &&
        ((role === ImplementerRole.FELLOW && group?.leaderId === identifier) ||
          (role === ImplementerRole.SUPERVISOR &&
            group?.school?.assignedSupervisorId === identifier) ||
          (role === ImplementerRole.HUB_COORDINATOR &&
            (group?.school?.hub?.coordinators.some((c) => c.id === identifier) ?? false))));

    if (!group || !inScope) throw new Error("Forbidden");

    const doc = await db.attendanceDocuments.findFirst({
      where: { sessionId, groupId, archivedAt: null },
      orderBy: { createdAt: "desc" },
    });

    if (!doc) throw new Error("No attendance document found for this session");

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

    const ticket = await db.s3UploadPermit.findFirst({
      where: {
        bucket: "student-attendance",
        key: payload.link,
        issuedTo: userId,
        status: "PENDING",
        expiresAt: { gt: new Date() },
      },
    });
    if (!ticket) throw new Error("Upload not authorized");

    const ctx = ticket.context as { groupId: string; sessionId: string };
    if (ctx.groupId !== payload.groupId || ctx.sessionId !== payload.sessionId) {
      throw new Error("Upload does not match authorized scope");
    }

    const markedStudentCount = await db.studentAttendance.count({
      where: {
        sessionId: payload.sessionId,
        groupId: payload.groupId,
      },
    });

    if (markedStudentCount < 2) {
      throw new Error("At least 2 students must have attendance marked before uploading");
    }

    const supersededDocs = await db.attendanceDocuments.findMany({
      where: {
        sessionId: payload.sessionId,
        groupId: payload.groupId,
        archivedAt: null,
      },
      select: { link: true },
    });

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

      const consumed = await tx.s3UploadPermit.updateMany({
        where: { id: ticket.id, status: "PENDING" },
        data: { status: "USED", usedAt: new Date() },
      });
      if (consumed.count === 0) {
        throw new Error("Upload permit already consumed");
      }
    });

    await Promise.all(
      supersededDocs
        .map((doc) => doc.link)
        .filter((link): link is string => Boolean(link) && link !== payload.link)
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
