import { authenticate } from "@google-cloud/local-auth"; // Make sure to have this library installed
import fs from "fs";
import { google } from "googleapis";
import path from "path";
const { GoogleAuth } = require("google-auth-library");
const apikeys = require("../googleapikey.json");
const apikeysUpdatd = require("./sdhgoogle.json");
const mime = require("mime-types");

const SCOPE = "https://www.googleapis.com/auth/drive";

const filePath = path.join(__dirname, "./sdhgoogle.json");

async function getAuthClient() {
  console.log("inside getAuthClient");
  const auth = await authenticate({
    keyfilePath: "./sdhgoogle.json", // Replace with the path to your service account key file
    scopes: ["https://www.googleapis.com/auth/drive"], // Specify the required scopes
  });
  console.log({ auth }, "9");
  return auth;
}

// async function getAuthClient() {
//   const auth = await new GoogleAuth({
//     keyfilePath: "../googleapikey.json", // Replace with your credentials file path
//     scopes: ["https://www.googleapis.com/auth/drive"],
//   });
//   console.log({ auth });
//   return auth;
// }

async function authorize() {
  const jwtClient = new google.auth.JWT(
    apikeysUpdatd.client_email,
    undefined,
    apikeysUpdatd.private_key,
    [SCOPE],
    undefined,
  );

  //   console.log(jwtClient);
  console.log("authorize");
  let arr = await jwtClient.authorize();
  console.log(arr);
  return arr;
}

// async function uploadFile(auth: any, file: any) {
//   const drive = google.drive({ version: "v3", auth });

//   const res = await drive.files.create({
//     requestBody: {
//       name: file.name,
//       mimeType: file.mimeType,
//     },
//     media: {
//       mimeType: file.mimeType,
//       body: file.body,
//     },
//   });

//   return res.data;
// }

async function uploadFile(authClient) {
  console.log(__dirname);
  console.log({ authClient });
  return new Promise((resolve, rejected) => {
    const drive = google.drive({
      version: "v3",
      auth: {
        client_email: apikeysUpdatd.client_email,
        private_key: apikeysUpdatd.private_key,
      },
    });
    var fileMetaData = {
      name: "mydrivetext.txt",
      parents: ["1A6jUa08hZ95zU8N4VBV-kGMd96vX9Des"], // A folder ID to which file will get uploaded
    };

    const filePath = path.join(__dirname, "drive.txt"); // Constructing the file path relative to the script's directory
    const mimeType = mime.lookup(filePath);
    drive.files.create(
      {
        resource: fileMetaData,
        media: {
          body: fs.createReadStream(filePath), // files that will get uploaded
          mimeType: mimeType || "application/octet-stream",
        },
        fields: "id",
      },
      function (error, file) {
        if (error) {
          return rejected(error);
        }
        resolve(file);
      },
    );
  });
}

// async function uploadFile(authClient, filePath) {
//   console.log("iiii");
//   return new Promise((resolve, reject) => {
//     const drive = google.drive({ version: "v3", auth: authClient });

//     console.log("2222");

//     const fileMetadata = {
//       name: "clinicalnote.docx", // Set the desired file name here
//       parents: ["1A6jUa08hZ95zU8N4VBV-kGMd96vX9Des"],
//     };

//     const mimeType = mime.lookup(filePath);
//     console.log(mimeType, "999999");

//     drive.files.create(
//       {
//         requestBody: fileMetadata,
//         media: {
//           body: fs.createReadStream(filePath),
//           mimeType: mimeType || "application/octet-stream",
//         },
//         fields: "id",
//       },
//       function (err, file) {
//         if (err) {
//           console.log("kkk");
//           console.error(err);
//           reject(err);
//         } else {
//           console.log("File Id: ", file.id);
//           resolve(file);
//         }
//       },
//     );
//   });
// }
getAuthClient();
// authorize();

// .then((authClient) => {
//   console.log("authClient");
//   return uploadFile(authClient);
// })
// .catch((err) => {
//   console.log(err);
// });
// getAuthClient()
//   .then((authClient) => {
//     console.log("authClient");
//     return uploadFile(authClient);
//   })
//   .catch((err) => {
//     console.log(err);
//   });
