import type { Prisma } from "@prisma/client";
import { type NextRequest, NextResponse } from "next/server";
import { parseCsvUpload } from "#/app/api/csv-uploads/parse-csv-upload";
import { objectId } from "#/lib/crypto";
import { db } from "#/lib/db";

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
] as const;

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

    const fileBuffer = Buffer.from(await file.arrayBuffer());

    let records: Record<(typeof studentsCSVHeaders)[number], string>[];
    try {
      records = parseCsvUpload(fileBuffer, studentsCSVHeaders);
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : error },
        { status: 400 },
      );
    }

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

    const rows: StudentRow[] = records.map((row) => {
      const studentId = objectId("stu");
      return {
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
      };
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
