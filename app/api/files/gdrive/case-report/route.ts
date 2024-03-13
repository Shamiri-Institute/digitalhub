import { currentSupervisor } from "#/app/auth";
import { createDocumentPermission } from "#/commands/google-drive-actions";
import { db } from "#/lib/db";
import { google } from "googleapis";
import mime from "mime-types";
import { NextRequest, NextResponse } from "next/server";
import { Readable } from "stream";

const SCOPES = ["https://www.googleapis.com/auth/drive"];

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_id: process.env.GOOGLE_CLIENT_ID,
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    project_id: process.env.GOOGLE_PROJECT_ID,
    private_key: process.env.GOOGLE_PRIVATE_KEY,
  },

  scopes: SCOPES,
});

export async function POST(request: NextRequest) {
  const formData = await request.formData();

  const supervisor = await currentSupervisor();

  try {
    const file = formData.get("file") as File;

    const buffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(buffer);

    const studentId = formData.get("studentId") as string;
    const caseId = formData.get("caseId") as string;

    await uploadTCaseReport(fileBuffer, {
      studentId: studentId ?? "",
      supervisorName: supervisor?.supervisorName ?? "",
      supervisorEmail: supervisor?.supervisorEmail ?? "",
      filename: file.name,
      caseId,
    });

    return NextResponse.json({
      status: 200,
      message: "File uploaded successfully.",
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({
      status: 500,
      error: "Error uploading file.",
    });
  }
}

async function uploadTCaseReport(
  fileBuffer: Buffer,
  {
    studentId,
    supervisorName,
    supervisorEmail,
    filename,
    caseId,
  }: {
    studentId: string;
    supervisorName: string;
    supervisorEmail: string;
    filename: string;
    caseId: string;
  },
) {
  const mimeType = mime.lookup(filename);

  try {
    const { data } = await google.drive({ version: "v3", auth }).files.create({
      media: {
        mimeType: mimeType || "application/octet-stream",
        body: Readable.from(fileBuffer),
      },
      requestBody: {
        name: `${supervisorName}_${studentId}_TP`,
        parents: [process.env.CASEREPORTS_FILEID || ""], //folder id in which file should be uploaded
      },
      fields: "id,name",
    });

    if (!data.id) {
      throw new Error("File not uploaded. No data.id");
    }

    await createDocumentPermission(data.id, supervisorEmail);

    const fileId = data.id;

    const shareResponse = await google
      .drive({ version: "v3", auth: auth })
      .files.get({
        fileId: fileId,
        fields: "webViewLink",
      });

    const shareableLink = shareResponse.data.webViewLink;

    await db.clinicalScreeningInfo.update({
      where: {
        id: caseId,
      },
      data: {
        caseReport: shareableLink,
      },
    });

    return shareableLink;
  } catch (error) {
    console.error(error);
  }
}
