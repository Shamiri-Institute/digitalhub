import { objectId } from "#/lib/crypto";
import { db } from "#/lib/db";
import { Prisma } from "@prisma/client";
import * as fastCsv from "fast-csv";
import { NextRequest, NextResponse } from "next/server";
import { Readable } from "stream";

const studentsCSVHeaders = [
  "School", // prefer schoolId ?
  "GroupNumber",
  "Hub", //  prefer hubId
  "StudentName",
  "AdmissionNumber",
  "Form",
  "Stream",
  "Gender",
  "DateOfBirth", // age on db
  // any format for visibleId/id using objectId("stud")
];

export async function POST(request: NextRequest) {
  const formData = await request.formData();

  try {
    const file = formData.get("file") as File;
    const buffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(buffer);

    const csvStream = Readable.from([fileBuffer]);

    await hasRequiredHeaders(csvStream);

    const rows: Prisma.SupervisorGetPayload<{}>[] = [];

    const dataStream = Readable.from([fileBuffer]);

    dataStream
      .pipe(fastCsv.parse({ headers: true }))
      .on("data", async (row) => {
        let studentId = objectId("stu");
        rows.push({
          id: studentId,
          ...row,
          visibleId: studentId,
          supervisorEmail: row.shamiriEmail,
        });
      })
      .on("error", (err) => {
        return NextResponse.json({ error: err }, { status: 500 });
      })
      .on("end", async () => {
        try {
          await db.student.createMany({ data: rows });

          return NextResponse.json({
            status: 200,
            message: "File uploaded successfully.",
          });
        } catch (error) {
          console.error("Error uploading to database:", error);
          return NextResponse.json(
            { error: "Error uploading to database" },
            { status: 500 },
          );
        }
      });

    // return NextResponse.json({
    //   status: 200,
    //   message: "File uploaded successfully.",
    // });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error }, { status: 500 });
  }
}

async function hasRequiredHeaders(csvStream: Readable): Promise<boolean> {
  return new Promise<boolean>((resolve, reject) => {
    let headersChecked = false;
    csvStream
      .pipe(fastCsv.parse({ headers: true }))
      .on("headers", (headers) => {
        if (!headersChecked) {
          const requiredHeaders = studentsCSVHeaders;
          const missingHeaders = requiredHeaders.filter(
            (header) => !headers.includes(header.trim()),
          );
          if (missingHeaders.length === 0) {
            headersChecked = true;
            resolve(true);
          } else {
            reject(`Missing required headers: ${missingHeaders.join(", ")}`);
          }
        }
      })
      .on("error", reject);
  });
}
