import { objectId } from "#/lib/crypto";
import { db } from "#/lib/db";
import { Prisma } from "@prisma/client";
import * as fastCsv from "fast-csv";
import { NextRequest, NextResponse } from "next/server";
import { Readable } from "stream";

const studentsCSVHeaders = [
  "School", // prefer schoolId ?
  "Group number",
  "Hub", //  prefer hubId
  "Student name",
  "Admission number",
  "Form",
  "Stream",
  "Gender",
  "Date of Birth", // age on db
];

export async function POST(request: NextRequest) {
  const formData = await request.formData();

  const school = await db.school.findFirst({
    where: {
      visibleId: formData.get("schoolVisibleId") as string,
    },
  });

  if (!school) {
    return NextResponse.json({ error: "School not found" }, { status: 404 });
  }

  try {
    const file = formData.get("file") as File;
    const hubId = formData.get("hubId") as string;
    const implementerId = formData.get("implementerId") as string;
    const projectId = formData.get("projectId") as string;

    const buffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(buffer);

    const csvStream = Readable.from([fileBuffer]);

    await hasRequiredHeaders(csvStream);

    const rows: Prisma.StudentGetPayload<{
      select: {
        id: boolean;
        createdAt: boolean;
        updatedAt: boolean;
        schoolId: boolean;
        groupName: boolean;
        studentName: boolean;
        admissionNumber: boolean;
        form: boolean;
        stream: boolean;
        gender: boolean;
        visibleId: boolean;
        yearOfImplementation: boolean;
        age: boolean;
      };
    }>[] = [];

    const dataStream = Readable.from([fileBuffer]);

    dataStream
      .pipe(fastCsv.parse({ headers: true }))
      .on("data", async (row) => {
        console.log({ row });
        let studentId = objectId("stu");
        rows.push({
          id: studentId,
          createdAt: new Date(),
          updatedAt: new Date(),
          schoolId: school.id,
          groupName: row["Group number"],
          studentName: row["Student name"],
          admissionNumber: row["Admission number"],
          form: parseInt(row.Form),
          stream: row.Stream,
          gender: row.Gender,
          visibleId: studentId,
          yearOfImplementation: new Date().getFullYear(),
          age: null,
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

    return NextResponse.json({
      status: 200,
      message: "File uploaded successfully.",
    });
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
