"use server";

import { ImplementerRole } from "@prisma/client";
import { getCurrentUserSession } from "#/app/auth";
import { db } from "#/lib/db";

export interface CreateStudentAttendanceDocPayload {
  fileName: string;
  groupId: string;
  sessionId: string;
  link: string;
}

export async function createStudentAttendanceDocument(payload: CreateStudentAttendanceDocPayload) {
  try {
    const session = await getCurrentUserSession();

    if (!session?.user.id) {
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
