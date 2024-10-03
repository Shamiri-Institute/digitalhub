"use server";

import { db } from "#/lib/db";

export async function removeUploadedSchoolFile(documentId: string) {
  try {
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
