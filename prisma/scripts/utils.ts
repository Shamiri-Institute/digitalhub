import * as csv from "csv-parse";
import * as fs from "fs";
import * as path from "path";

/**
 * Loads and parse CSV file in ./data/ directory
 * These CSV files are downloaded from Airtable.
 *
 * TODO: batch process the files to avoid perf drag on loading biggest table (students ~30k rows)
 **/
export async function parseCsvFile(
  fileName: string,
  callback: (row: any) => Promise<void>,
): Promise<any[]> {
  let recordsProcessed = 0;
  const duplicatesDetectorHash = new Set();
  const filePath = path.resolve(`./prisma/scripts/airtable/${fileName}.csv`);
  const records: any[] = [];

  return new Promise(async (resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(csv.parse({ delimiter: ",", columns: true }))
      .on("data", function (row: any) {
        const dataRow = replaceEmptyStringsWithNull(row);

        if (fileName === "school_info") {
          if (dataRow["Implementer_ID"].includes(",")) {
            console.warn(
              `Warning: Implementer_ID contains multiple values (${dataRow["Implementer_ID"]}). Check if this is correct. Truncating to one for now.`,
            );
            dataRow["Implementer_ID"] = dataRow["Implementer_ID"].split(",")[0];
          }
        }

        if (fileName === "implementer_info") {
          if (dataRow["Implementer"] === null) {
            console.warn(
              "Warning: Implementer name is null. Setting to empty string.",
            );
            dataRow["Implementer"] = "";
          }
          if (dataRow["Implementer_Type"] === null) {
            console.warn(
              "Warning: Implementer type is null. Setting to empty string.",
            );
            dataRow["Implementer_Type"] = "";
          }
        }

        if (fileName === "fellow_info") {
          if (dataRow["Fellow_ID"] === "TFW23_S_301") {
            console.log("debug", dataRow["Fellow_ID"]);
          }
        }

        if (fileName === "fellow_attendance_temp") {
          if (dataRow["Year_of _imp"] !== null) {
            dataRow["Year_of_imp"] = dataRow["Year_of _imp"];
            delete dataRow["Year_of _imp"];
          }

          if (dataRow["Supervisor_ID"]?.includes(",")) {
            console.warn(
              `Warning: Supervisor_ID contains multiple values (${dataRow["Supervisor_ID"]}). Check if this is correct. Truncating to one for now.`,
            );
            dataRow["Supervisor_ID"] = dataRow["Supervisor_ID"].split(",")[0];
          }

          if (duplicatesDetectorHash.has(dataRow["Attendance_ID"])) {
            console.warn(
              `Warning: Duplicate Attendance_ID (${dataRow["Attendance_ID"]}). Skipping.`,
            );
            return;
          }

          duplicatesDetectorHash.add(dataRow["Attendance_ID"]);
        }

        if (fileName === "supervisor_info") {
          if (dataRow["Supervisor"] === null) {
            console.warn(
              "Warning: Supervisor name is null. Setting to empty string.",
            );
            dataRow["Supervisor"] = "";
          }
          if (dataRow["Hub_ID"]?.includes(",")) {
            console.warn(
              `Warning: Hub_ID contains multiple values (${dataRow["Hub_ID"]}). Check if this is correct. Truncating to one for now.`,
            );
            dataRow["Hub_ID"] = dataRow["Hub_ID"].split(",")[0];
          }
        }

        if (fileName === "student_info") {
          if (duplicatesDetectorHash.has(dataRow["Shamiri_ID"])) {
            console.warn(
              `Warning: Duplicate Shamiri_ID (${dataRow["Shamiri_ID"]}). Skipping.`,
            );
            return;
          }

          if (dataRow["Gender"] !== null) {
            dataRow["Gender"] = dataRow["Gender"].trim();
          }

          duplicatesDetectorHash.add(dataRow["Shamiri_ID"]);
        }

        if (recordsProcessed % 1000 === 0) {
          console.log(`Parsed ${recordsProcessed} records`);
        }

        recordsProcessed += 1;

        records.push(callback(dataRow));
      })
      .on("end", function () {
        resolve(Promise.all(records));
      })
      .on("error", function (error: any) {
        console.log(error.message);
        reject(error);
      });
  });
}

interface GenericObject {
  [key: string]: any;
}

function replaceEmptyStringsWithNull(obj: GenericObject): GenericObject {
  return Object.entries(obj).reduce((newObj: GenericObject, [key, value]) => {
    if (value === "") {
      newObj[key.trim()] = null;
    } else if (typeof value === "object" && value !== null) {
      // If value is an object or an array
      newObj[key.trim()] = replaceEmptyStringsWithNull(value);
    } else {
      newObj[key.trim()] = value;
    }
    return newObj;
  }, {});
}
