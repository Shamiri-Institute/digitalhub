"use server";

import { getCurrentUser } from "#/app/auth";
import { db } from "#/lib/db";

export async function removeUploadedSchoolFile(documentId: string) {
  try {
    const user = await getCurrentUser();

    if (!user) {
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

export async function updateUploadedSchoolFile(
  documentId: string,
  fileName: string,
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
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
    const user = await getCurrentUser();

    if (!user) {
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
        uploadedBy: user.user.id,
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
