import { currentSupervisor } from "#/app/auth";
import { createDocumentPermission } from "#/commands/google-drive-actions";
import { NextRequest, NextResponse } from "next/server";

const { Readable } = require("stream");
var mime = require("mime-types");

const { google } = require("googleapis");

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
    const file = formData.get("file");
    const studentId = formData.get("studentId");
    const schoolId = formData.get("schoolId");

    console.log({ studentId, schoolId });
    console.log(file, "fillllle");

    // return NextResponse.json({
    //   status: 200,
    //   message: "File uploaded successfully.",
    // });

    const resp = await uploadTreatmentPlan(file, {
      studentId: studentId,
      supervisorName: supervisor?.supervisorName,
      // supervisorEmail: supervisor?.supervisorEmail,
      supervisorEmail: "benny@shamiri.institute",
    });
    console.log("dadada", resp);
    return NextResponse.json({
      status: 200,
      message: "File uploaded successfully.",
    });
  } catch (error) {
    return NextResponse.json({
      status: 500,
      error: "Error uploading file.",
    });
  }
}

async function uploadTreatmentPlan(
  file: File,
  {
    studentId,
    supervisorName,
    supervisorEmail,
  }: {
    studentId: string;
    supervisorName: string;
    supervisorEmail: string;
  },
) {
  const fileStream = new Readable();
  fileStream.push(file); // Assuming file.buffer contains the file content
  fileStream.push(null); // End the stream

  const mimeType = mime.lookup(file.name);
  console.log({ mimeType });
  try {
    console.log("inside upload treatment plan", file);
    // return;
    const { data } = await google
      .drive({ version: "v3", auth: auth })
      .files.create({
        media: {
          mimeType: mimeType || "application/octet-stream",
          body: fileStream,
        },
        requestBody: {
          name: `${supervisorName}_${studentId}_TP`,
          parents: [process.env.TREATMENTPLAN_FILEID], //folder id in which file should be uploaded
        },
        fields: "id,name",
      });

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
