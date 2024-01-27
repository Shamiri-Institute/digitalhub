const { google } = require("googleapis");
const path = require("node:path");
const fs = require("node:fs");

var mime = require("mime-types");

const KEY_FILE_PATH = path.join(__dirname, "sdhgoogle.json");

const SCOPES = ["https://www.googleapis.com/auth/drive"];

const auth = new google.auth.GoogleAuth({
  keyFile: KEY_FILE_PATH,
  scopes: SCOPES,
});

const uploadFileToGoogleDrive = async () => {
  console.log("inn");
  try {
    const filePath = path.join(__dirname, "doctesting.docx");
    // get file name without extension
    const fileName = path.basename(filePath).split(".")[0];

    const mimeType = mime.lookup(filePath);
    console.log({ mimeType });

    const { data } = await google
      .drive({ version: "v3", auth: auth })
      .files.create({
        media: {
          mimeType: mimeType || "application/octet-stream",
          body: fs.createReadStream(filePath),
        },
        requestBody: {
          name: fileName,
          parents: ["1A6jUa08hZ95zU8N4VBV-kGMd96vX9Des"], //folder id in which file should be uploaded
          // create sub folder inside folder
        },
        fields: "id,name",
      });

    console.log(`File uploaded successfully -> ${JSON.stringify(data)}`);
  } catch (error) {
    console.log(error);
  }
};

uploadFileToGoogleDrive();
