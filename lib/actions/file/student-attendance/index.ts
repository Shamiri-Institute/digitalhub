"use server";

import { ImplementerRole, type Prisma } from "@prisma/client";
import { getCurrentUserSession } from "#/app/auth";
import { db } from "#/lib/db";

export interface CreateStudentAttendanceDocPayload {
  fileName: string;
  groupId: string;
  sessionId: string;
  link: string;
}

export interface StudentAttendanceDocsFilters {
  groupId?: string;
  sessionId?: string;
}

export type StudentAttendanceFileData = Prisma.AttendanceDocumentsGetPayload<{
  include: {
    group: { select: { groupName: true } };
    session: { include: { session: { select: { sessionName: true } } } };
  };
}>;

export async function createStudentAttendanceDocument(payload: CreateStudentAttendanceDocPayload) {
  try {
    const session = await getCurrentUserSession();

    if (!session?.user.id || session.user.activeMembership?.role !== ImplementerRole.FELLOW) {
      throw new Error("The session has not been authenticated");
    }

    await db.attendanceDocuments.create({
      data: {
        ...payload,
        uploadedBy: session.user.id,
      },
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

export async function getStudentDocuments(filters: StudentAttendanceDocsFilters) {
  try {
    const session = await getCurrentUserSession();

    if (!session?.user.id || session.user.activeMembership?.role !== ImplementerRole.FELLOW) {
      throw new Error("The session has not been authenticated");
    }

    const where: Prisma.AttendanceDocumentsWhereInput = {};
    if (filters.groupId) where.groupId = filters.groupId;
    if (filters.sessionId) where.sessionId = filters.sessionId;

    const docs = await db.attendanceDocuments.findMany({
      where,
      include: {
        group: { select: { groupName: true } },
        session: { include: { session: { select: { sessionName: true } } } },
      },
      orderBy: { createdAt: "desc" },
    });

    return docs;
  } catch (error) {
    console.error(error);
    return [];
  }
}
