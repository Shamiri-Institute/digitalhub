import { objectId } from "#/lib/crypto";
import { db } from "#/lib/db";
import { Prisma } from "@prisma/client";
import * as fastCsv from "fast-csv";
import { NextRequest, NextResponse } from "next/server";
import { Readable } from "stream";

const fellowCSVHeaders = [
  "fellow",
  "cell_no",
  "email",
  "supervisor", // to be supervisorId
  "hub",
];

export async function POST(request: NextRequest) {
  const formData = await request.formData();

  try {
    const file = formData.get("file") as File;

    const schoolVisibleId = formData.get("schoolVisibleId") as string;
    const hubId = formData.get("hubId") as string;
    const implementerId = formData.get("implementerId") as string;
    const projectId = formData.get("projectId") as string;

    const supervisors = await db.supervisor.findMany({
      where: {
        hubId: hubId,
      },
    });

    if (!supervisors || supervisors.length === 0) {
      return NextResponse.json(
        { error: "No supervisors found for this hub, please add supervisors." },
        { status: 404 },
      );
    }

    const buffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(buffer);

    const csvStream = Readable.from([fileBuffer]);

    await hasRequiredHeaders(csvStream);

    const rows: Prisma.FellowGetPayload<{}>[] = [];

    const dataStream = Readable.from([fileBuffer]);

    dataStream
      .pipe(fastCsv.parse({ headers: true }))
      .on("data", async (row) => {
        let fellowId = objectId("fellow");
        rows.push({
          visibleId: fellowId,
          id: fellowId,
          createdAt: new Date(),
          updatedAt: new Date(),
          fellowName: row.fellow,
          cellNumber: row.cell_no,
          fellowEmail: row.email,
          supervisorId: null,
          hubId,
          implementerId: implementerId,
          yearOfImplementation: new Date().getFullYear(),
          archivedAt: null,
          mpesaName: null,
          mpesaNumber: null,
          idNumber: null,
          county: null,
          subCounty: null,
          dateOfBirth: null,
          gender: null,
          transferred: null,
          droppedOut: null,
          droppedOutAt: null,
          dropOutReason: null,
        });
        try {
          // await db.fellow.createMany({ data: rows });

          await db.$transaction(async (prisma) => {
            await prisma.fellow.createMany({ data: rows });
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
          const requiredHeaders = fellowCSVHeaders;
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
