"use server";

import { storeSupervisorProgressNotes } from "#/app/actions";

const { google } = require("googleapis");
const path = require("node:path");
const fs = require("node:fs");

var mime = require("mime-types");

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

export const createSupProgressNoteToGDriveAndSaveOnDb = async (inputData: {
  supervisorName: string;
  studentId: string;
  supervisorEmail: string;
  caseId: string;
}) => {
  try {
    const filePath = path.join("./commands", "progress_notes_doc.docx");

    const mimeType = mime.lookup(filePath);

    const { data } = await google
      .drive({ version: "v3", auth: auth })
      .files.create({
        media: {
          mimeType: mimeType || "application/octet-stream",
          body: fs.createReadStream(filePath),
        },
        requestBody: {
          name: `${inputData.supervisorName}_${inputData.studentId}_PN`,
          parents: [process.env.PROGRESSNOTE_FILEID], //folder id in which file should be uploaded
        },
        fields: "id,name",
      });

    await createDocumentPermission(data.id, inputData.supervisorEmail);

    const fileId = data.id;

    const shareResponse = await google
      .drive({ version: "v3", auth: auth })
      .files.get({
        fileId: fileId,
        fields: "webViewLink",
      });

    const shareableLink = shareResponse.data.webViewLink;

    await storeSupervisorProgressNotes(inputData.caseId, shareableLink);
  } catch (error) {
    console.log(error);
  }
};

const createDocumentPermission = async (
  fileId: string,
  targetUserEmail: string,
) => {
  const service = google.drive({ version: "v3", auth });

  const permissionIds = [];

  const permissions = [
    {
      type: "user",
      role: "writer",
      emailAddress: targetUserEmail,
    },
  ];
  // Note: Client library does not currently support HTTP batch
  // requests. When possible, use batched requests when inserting
  // multiple permissions on the same item. For this sample,
  // permissions are inserted serially.
  for (const permission of permissions) {
    try {
      const result = await service.permissions.create({
        resource: permission,
        fileId: fileId,
        fields: "id",
      });
      permissionIds.push(result.data.id);
    } catch (err) {
      console.error(err);
    }
  }
  return permissionIds;
};
