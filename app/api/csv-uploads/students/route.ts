import { Readable } from "node:stream";
import type { Prisma } from "@prisma/client";
import * as fastCsv from "fast-csv";
import { type NextRequest, NextResponse } from "next/server";
import { objectId } from "#/lib/crypto";
import { db } from "#/lib/db";

export const runtime = "nodejs";

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
    const _hubId = formData.get("hubId") as string;
    const _implementerId = formData.get("implementerId") as string;
    const _projectId = formData.get("projectId") as string;

    const buffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(buffer);

    const csvStream = Readable.from([fileBuffer]);

    await hasRequiredHeaders(csvStream);

    type StudentRow = Prisma.StudentGetPayload<{
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
    }>;

    const rows: StudentRow[] = await new Promise((resolve, reject) => {
      const parsedRows: StudentRow[] = [];
      const dataStream = Readable.from([fileBuffer]);

      dataStream
        .pipe(fastCsv.parse({ headers: true }))
        .on("data", (row) => {
          const studentId = objectId("stu");
          parsedRows.push({
            id: studentId,
            createdAt: new Date(),
            updatedAt: new Date(),
            schoolId: school.id,
            groupName: row.GroupNumber,
            studentName: row.StudentName,
            admissionNumber: row.AdmissionNumber,
            form: Number.parseInt(row.Form, 10),
            stream: row.Stream,
            gender: row.Gender,
            visibleId: studentId,
            yearOfImplementation: new Date().getFullYear(),
            age: null,
          });
        })
        .on("error", (err) => reject(err))
        .on("end", () => resolve(parsedRows));
    });

    await db.$transaction(async (prisma) => {
      await prisma.student.createMany({ data: rows });
    });

    return NextResponse.json({
      status: 200,
      message: `${rows.length} students uploaded successfully.`,
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
