import { currentSupervisor } from "#/app/auth";
import { createDocumentPermission } from "#/commands/google-drive-actions";
import { File } from "@web-std/file";
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

// POST for uploading file to Google Drive: of type File
export async function POST(request: NextRequest) {
  const formData = await request.formData();
  console.log("dsfdfdfdd");
  console.log("hhhee");
  console.log({ formData });

  const supervisor = await currentSupervisor();

  console.log(supervisor?.supervisorEmail);

  try {
    const file = formData.get("file") as File;
    console.log("about to get array buffer from file");
    const buffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(buffer);

    const studentId = formData.get("studentId") as string;
    const schoolId = formData.get("schoolId") as string;

    console.log({ studentId, schoolId });
    console.log(file, "fillllle");

    const resp = await uploadTreatmentPlan(fileBuffer, {
      studentId: studentId ?? "",
      supervisorName: supervisor?.supervisorName ?? "",
      // supervisorEmail: supervisor?.supervisorEmail,
      supervisorEmail: "benny@shamiri.institute",
      filename: file.name,
    });
    console.log("dadada", resp);
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

async function uploadTreatmentPlan(
  fileBuffer: Buffer,
  {
    studentId,
    supervisorName,
    supervisorEmail,
    filename,
  }: {
    studentId: string;
    supervisorName: string;
    supervisorEmail: string;
    filename: string;
  },
) {
  const mimeType = mime.lookup(filename);
  console.log({ mimeType });
  try {
    console.log("inside upload treatment plan", fileBuffer, filename);
    const { data } = await google.drive({ version: "v3", auth }).files.create({
      media: {
        mimeType: mimeType || "application/octet-stream",
        body: Readable.from(fileBuffer),
      },
      requestBody: {
        name: `${supervisorName}_${studentId}_TP`,
        parents: [process.env.TREATMENTPLAN_FILEID || ""], //folder id in which file should be uploaded
      },
      fields: "id,name",
    });

    if (!data.id) {
      throw new Error("File not uploaded. No data.id");
    }

    await createDocumentPermission(data.id, "benny@shamiri.institute");
    // await createDocumentPermission(data.id, supervisorEmail);

    const fileId = data.id;

    const shareResponse = await google
      .drive({ version: "v3", auth: auth })
      .files.get({
        fileId: fileId,
        fields: "webViewLink",
      });

    console.log(shareResponse, "shareResponse");
    const shareableLink = shareResponse.data.webViewLink;

    return shareableLink;
    // todo: store the shareable link in the database
    return "https://www.google.com";
  } catch (error) {
    console.log(error);
  }
}
