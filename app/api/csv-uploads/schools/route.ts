import { currentHubCoordinator } from "#/app/auth";
import { objectId } from "#/lib/crypto";
import { db } from "#/lib/db";
import { Prisma } from "@prisma/client";
import * as fastCsv from "fast-csv";
import { NextRequest, NextResponse } from "next/server";
import { Readable } from "stream";

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

export async function POST(request: NextRequest) {
  const formData = await request.formData();

  try {
    const file = formData.get("file") as File;

    const hc = await currentHubCoordinator();

    if (!hc) {
      return NextResponse.json(
        { error: "Hub coordinator not found." },
        { status: 404 },
      );
    }

    const hubId = hc.assignedHubId ?? (formData.get("hubId") as string);
    const implementerId =
      hc.implementerId ?? (formData.get("implementerId") as string);

    const buffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(buffer);

    const csvStream = Readable.from([fileBuffer]);

    await hasRequiredHeaders(csvStream);

    const rows: Prisma.SchoolGetPayload<{}>[] = [];

    const dataStream = Readable.from([fileBuffer]);

    dataStream
      .pipe(fastCsv.parse({ headers: true }))
      .on("data", async (row) => {
        let schoolId = objectId("school");

        let parsedPreSessionDate = parseDate(row.presession_date);
        if (!parsedPreSessionDate) {
          parsedPreSessionDate = null;
        }

        rows.push({
          id: schoolId,
          schoolName: row.school_name,
          numbersExpected: parseInt(row.numbers_expected),
          schoolDemographics: row.school_demographics,
          boardingDay: row.boardingorday,
          schoolType: row.school_type,
          schoolCounty: row.school_county,
          schoolSubCounty: row.school_subcounty,
          principalName: row.principal_name,
          principalPhone: row.principal_phone,
          pointPersonName: row.point_person_name,
          pointPersonPhone: row.point_person_phone,
          latitude: parseFloat(row.latitude),
          longitude: parseFloat(row.longitude),
          hubId: hubId,
          implementerId: implementerId,
          preSessionDate: parsedPreSessionDate ?? null,
          assignedSupervisorId: null,
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
        try {
          await db.$transaction(async (prisma) => {
            await prisma.school.createMany({ data: rows });
          });

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
      })
      .on("error", (err) => {
        return NextResponse.json({ error: err }, { status: 500 });
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
