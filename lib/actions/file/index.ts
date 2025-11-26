"use server";

import { getCurrentUserSession } from "#/app/auth";
import { db } from "#/lib/db";
import { ImplementerRole } from "@prisma/client";

export async function removeUploadedSchoolFile(documentId: string) {
  try {
    const session = await getCurrentUserSession();

    if (!session || !session.user.id || (session.user.activeMembership?.role !== ImplementerRole.HUB_COORDINATOR && session.user.activeMembership?.role !== ImplementerRole.SUPERVISOR)) {
      throw new Error("The session has not been authenticated");
    }

    const result = await db.schoolDocuments.delete({
      where: {
        id: documentId,
      },
    });
    return {
      success: true,
      message: `Successfully removed ${result.fileName}.`,
    };
  } catch (error) {
    console.error(error);
    return { error: "Something went wrong removing the file" };
  }
}

export async function updateUploadedSchoolFile(documentId: string, fileName: string) {
  try {
    const session = await getCurrentUserSession();

    if (!session || !session.user.id || (session.user.activeMembership?.role !== ImplementerRole.HUB_COORDINATOR && session.user.activeMembership?.role !== ImplementerRole.SUPERVISOR)) {
      throw new Error("The session has not been authenticated");
    }

    const result = await db.schoolDocuments.update({
      where: {
        id: documentId,
      },
      data: {
        fileName,
      },
    });
    return {
      success: true,
      message: `Successfully updated to ${result.fileName}.`,
    };
  } catch (error) {
    console.error(error);
    return { error: "Something went wrong updating the file" };
  }
}

export async function addUploadedSchoolDocs(data: {
  fileName: string;
  link: string;
  visibleId: string;
  type: string;
}) {
  try {
    const session = await getCurrentUserSession();

    if (!session || !session.user.id || (session.user.activeMembership?.role !== ImplementerRole.HUB_COORDINATOR && session.user.activeMembership?.role !== ImplementerRole.SUPERVISOR)) {
      throw new Error("The session has not been authenticated");
    }

    const school = await db.school.findFirst({
      where: {
        visibleId: data.visibleId,
      },
    });

    if (!school) {
      throw new Error("School not found");
    }
    await db.schoolDocuments.create({
      data: {
        fileName: data.fileName,
        link: data.link,
        schoolId: school.id,
        uploadedBy: session.user.id,
        type: data.type,
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
