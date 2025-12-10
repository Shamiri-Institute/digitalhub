import { Readable } from "node:stream";
import type { Prisma } from "@prisma/client";
import * as fastCsv from "fast-csv";
import { type NextRequest, NextResponse } from "next/server";
import { currentHubCoordinator } from "#/app/auth";
import { objectId } from "#/lib/crypto";
import { db } from "#/lib/db";

const schoolsCSVHeaders = [
  "school_name",
  "numbers_expected",
  "school_demographics",
  "boardingorday",
  "school_type",
  "school_county",
  "school_subcounty",
  "principal_name",
  "principal_phone",
  "point_person_name",
  "point_person_phone",
  "latitude",
  "longitude",
  "presession_date",
];

interface SchoolError {
  schoolName: string;
  rowNumber: number;
  rowData: Record<string, unknown>;
  error: string;
}

interface ValidationContext {
  hubId: string;
  rowNumber: number;
  errorSchools: SchoolError[];
}

async function validateRow(row: Record<string, string>, context: ValidationContext) {
  const { hubId, rowNumber, errorSchools } = context;

  // Validate required school name
  if (!row.school_name?.trim()) {
    errorSchools.push({
      schoolName: row.school_name || "Unknown",
      error: "School name is required",
      rowNumber,
      rowData: {
        ...row,
        available_fellows: "N/A",
        fellows_needed: "N/A",
      },
    });
    return false;
  }

  // Validate presession date (note: pressessions can happen in different schools at the same time so not grouping by presession date)
  if (row.presession_date) {
    const parsedDate = parseDate(row.presession_date);
    if (parsedDate) {
      const currentDate = new Date();
      if (parsedDate < currentDate) {
        errorSchools.push({
          schoolName: row.school_name,
          error: "Pre-session date cannot be in the past",
          rowNumber,
          rowData: {
            ...row,
            available_fellows: "N/A",
            fellows_needed: "N/A",
          },
        });
        return false;
      }
    }
  }

  // Validate numbers expected (students) against fellows capacity
  if (row.numbers_expected) {
    const fellowsCount = await db.fellow.count({
      where: {
        hubId: hubId,
        droppedOut: null, // Only count active fellows
      },
    });

    const studentsPerFellow = fellowsCount
      ? Number.parseInt(row.numbers_expected) / fellowsCount
      : Number.POSITIVE_INFINITY;

    if (studentsPerFellow > 15) {
      errorSchools.push({
        schoolName: row.school_name,
        error: `Expected number of students (${row.numbers_expected}) exceeds fellow capacity. With ${fellowsCount} fellows, each would handle ${Math.round(studentsPerFellow)} students, which is more than the maximum of 15.`,
        rowNumber,
        rowData: {
          ...row,
          available_fellows: String(fellowsCount),
          fellows_needed: String(Math.round(studentsPerFellow)),
        },
      });
      return false;
    }
  }

  return true;
}

async function validateExistingSchools(
  rows: Prisma.SchoolGetPayload<{}>[],
  errorSchools: SchoolError[],
) {
  const schoolNames = rows.map((row) => row.schoolName);
  const existingSchools = await db.school.findMany({
    where: {
      schoolName: {
        in: schoolNames,
      },
    },
    select: {
      schoolName: true,
    },
  });

  if (existingSchools.length > 0) {
    existingSchools.forEach((school) => {
      const rowIndex = rows.findIndex((r) => r.schoolName === school.schoolName);
      const rowData = rows[rowIndex];
      if (rowData) {
        errorSchools.push({
          schoolName: school.schoolName,
          error: "School already exists in the system",
          rowNumber: rowIndex + 2,
          rowData: rowData,
        });
      }
    });
    return false;
  }
  return true;
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const errorSchools: SchoolError[] = [];

  try {
    const file = formData.get("file") as File;
    const hc = await currentHubCoordinator();

    if (!hc) {
      return NextResponse.json({ error: "Hub coordinator not found." }, { status: 401 });
    }

    const hubId = hc.profile?.assignedHubId ?? (formData.get("hubId") as string);
    const implementerId = hc.profile?.implementerId ?? (formData.get("implementerId") as string);

    const buffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(buffer);
    const csvStream = Readable.from([fileBuffer]);

    try {
      await hasRequiredHeaders(csvStream);
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : error },
        { status: 400 },
      );
    }

    const rows: Prisma.SchoolGetPayload<{}>[] = await new Promise((resolve, reject) => {
      const parsedRows: Prisma.SchoolGetPayload<{}>[] = [];
      const dataStream = Readable.from([fileBuffer]);
      let rowNumber = 1;

      dataStream
        .pipe(fastCsv.parse({ headers: true }))
        .on("data", async (row) => {
          rowNumber++;

          // Validate row
          const isValid = await validateRow(row, {
            hubId,
            rowNumber,
            errorSchools,
          });

          if (isValid) {
            const schoolId = objectId("school");
            const parsedPreSessionDate = parseDate(row.presession_date) || null;

            parsedRows.push({
              id: schoolId,
              schoolName: row.school_name,
              numbersExpected: Number.parseInt(row.numbers_expected),
              schoolDemographics: row.school_demographics,
              boardingDay: row.boardingorday,
              schoolType: row.school_type,
              schoolCounty: row.school_county,
              schoolSubCounty: row.school_subcounty,
              principalName: row.principal_name,
              principalPhone: row.principal_phone,
              pointPersonName: row.point_person_name,
              pointPersonPhone: row.point_person_phone,
              latitude: Number.parseFloat(row.latitude),
              longitude: Number.parseFloat(row.longitude),
              hubId: hubId,
              implementerId: implementerId,
              preSessionDate: parsedPreSessionDate,
              visibleId: schoolId,
              createdAt: new Date(),
              updatedAt: new Date(),
              archivedAt: null,
              schoolEmail: null,
              pointPersonId: null,
              pointPersonEmail: null,
              droppedOut: null,
              droppedOutAt: null,
              dropoutReason: null,
              assignedSupervisorId: null,
              session1Date: null,
              session2Date: null,
              session3Date: null,
              session4Date: null,
              clinicalFollowup1Date: null,
              clinicalFollowup2Date: null,
              clinicalFollowup3Date: null,
              clinicalFollowup4Date: null,
              clinicalFollowup5Date: null,
              clinicalFollowup6Date: null,
              clinicalFollowup7Date: null,
              clinicalFollowup8Date: null,
              dataCollectionFollowup1Date: null,
            });
          }
        })
        .on("error", (err) => reject(err))
        .on("end", () => resolve(parsedRows));
    });

    await validateExistingSchools(rows, errorSchools);

    // If there are any errors, return them without inserting any records
    if (errorSchools.length > 0) {
      return NextResponse.json(
        {
          status: 400,
          success: false,
          message: "Upload failed due to validation errors",
          errors: errorSchools,
          totalErrors: errorSchools.length,
        },
        { status: 400 },
      );
    }

    // If no errors, proceed with insertion
    await db.$transaction(async (prisma) => {
      await prisma.school.createMany({ data: rows });
    });

    return NextResponse.json({
      status: 200,
      success: true,
      message: `${rows.length} schools uploaded successfully.`,
    });
  } catch (error) {
    console.error("Error processing file upload:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Something went wrong. Please try again.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

async function hasRequiredHeaders(csvStream: Readable): Promise<boolean> {
  return new Promise<boolean>((resolve, reject) => {
    let headersChecked = false;
    csvStream
      .pipe(fastCsv.parse({ headers: true }))
      .on("headers", (headers) => {
        if (!headersChecked) {
          const requiredHeaders = schoolsCSVHeaders;
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

function parseDate(dateString: string | undefined): Date | null {
  if (!dateString) return null;

  const dateRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
  const match = dateString.match(dateRegex);

  if (!match) {
    return null;
  }

  const [_, month, day, year] = match;
  const parsedDate = new Date(`${year}-${month}-${day}`);

  return isNaN(parsedDate.getTime()) ? null : parsedDate;
}
