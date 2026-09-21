"use server";

import { and, eq, inArray, isNull, or, type SQL, sql } from "drizzle-orm";

import { getCurrentUserSession } from "#/app/auth";
import { db, isSerializationFailure } from "#/db/client";
import { ImplementerRole } from "#/db/enums";
import {
  attendanceDocuments,
  fellow,
  hubCoordinator,
  interventionGroup,
  school,
  studentAttendance,
} from "#/db/schema";
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

/** Groups the caller may see; `null` means the role may not see any. */
function buildAttendanceScopeFilter(
  role: ImplementerRole | undefined,
  identifier: string | null | undefined,
): SQL | null {
  if (role === ImplementerRole.ADMIN) return sql`true`;
  if (!identifier) return null;

  switch (role) {
    case ImplementerRole.FELLOW:
      return eq(interventionGroup.leaderId, identifier);
    case ImplementerRole.SUPERVISOR:
      return (
        or(
          inArray(
            interventionGroup.leaderId,
            db.select({ id: fellow.id }).from(fellow).where(eq(fellow.supervisorId, identifier)),
          ),
          inArray(
            interventionGroup.schoolId,
            db
              .select({ id: school.id })
              .from(school)
              .where(eq(school.assignedSupervisorId, identifier)),
          ),
        ) ?? null
      );
    case ImplementerRole.HUB_COORDINATOR:
      return inArray(
        interventionGroup.schoolId,
        db
          .select({ id: school.id })
          .from(school)
          .where(
            inArray(
              school.hubId,
              db
                .select({ id: hubCoordinator.assignedHubId })
                .from(hubCoordinator)
                .where(eq(hubCoordinator.id, identifier)),
            ),
          ),
      );
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

    const [group] = await db
      .select({ id: interventionGroup.id })
      .from(interventionGroup)
      .where(and(eq(interventionGroup.id, groupId), scopeFilter))
      .limit(1);

    if (!group) throw new Error("Forbidden");

    const doc = await db.query.attendanceDocuments.findFirst({
      where: (d, { and, eq, isNull }) =>
        and(eq(d.sessionId, sessionId), eq(d.groupId, groupId), isNull(d.archivedAt)),
      orderBy: (d, { desc }) => desc(d.createdAt),
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

    const markedStudentCount = await db.$count(
      studentAttendance,
      and(
        eq(studentAttendance.sessionId, payload.sessionId),
        eq(studentAttendance.groupId, payload.groupId),
      ),
    );

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
    const activeFilter = and(
      eq(attendanceDocuments.sessionId, payload.sessionId),
      eq(attendanceDocuments.groupId, payload.groupId),
      isNull(attendanceDocuments.archivedAt),
    );

    try {
      await db.transaction(
        async (tx) => {
          const active = await tx.query.attendanceDocuments.findMany({
            where: (d, { and, eq, isNull }) =>
              and(
                eq(d.sessionId, payload.sessionId),
                eq(d.groupId, payload.groupId),
                isNull(d.archivedAt),
              ),
            columns: { id: true, link: true },
            orderBy: (d, { desc }) => desc(d.createdAt),
          });

          const currentActiveId = active[0]?.id ?? null;
          if (currentActiveId !== payload.expectedActiveDocId) {
            throw new StaleAttendanceUploadError();
          }

          for (const doc of active) supersededLinks.push(doc.link);

          await tx.update(attendanceDocuments).set({ archivedAt: new Date() }).where(activeFilter);

          await tx.insert(attendanceDocuments).values({
            groupId: payload.groupId,
            sessionId: payload.sessionId,
            link: claim.key,
            fileName: claim.fileName,
            uploadedBy: userId,
          });
        },
        { isolationLevel: "serializable" },
      );
    } catch (txError) {
      const stillReferenced = await db.$count(
        attendanceDocuments,
        eq(attendanceDocuments.link, payload.link),
      );
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
    if (isSerializationFailure(error)) {
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

    const doc = await db.query.attendanceDocuments.findFirst({
      where: (d, { and, eq, inArray }) =>
        and(
          eq(d.id, documentId),
          inArray(
            d.groupId,
            db
              .select({ id: interventionGroup.id })
              .from(interventionGroup)
              .where(eq(interventionGroup.leaderId, fellowId)),
          ),
        ),
      columns: { id: true, link: true },
    });
    if (!doc) throw new Error("Forbidden");

    await db
      .update(attendanceDocuments)
      .set({ archivedAt: new Date() })
      .where(eq(attendanceDocuments.id, doc.id));

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
