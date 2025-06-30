import { currentHubCoordinator } from "#/app/auth";
import { objectId } from "#/lib/crypto";
import { db } from "#/lib/db";
import type { Prisma } from "@prisma/client";
import * as fastCsv from "fast-csv";
import { type NextRequest, NextResponse } from "next/server";
import { Readable } from "stream";

const fellowCSVHeaders = [
  "fellow_name",
  "cell_no",
  "email",
  "mpesa_name",
  "mpesa_number",
  "id_number",
  "gender",
  "county",
  "sub_county",
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

    try {
      await hasRequiredHeaders(csvStream);
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : error },
        { status: 400 },
      );
    }

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

    const rows: Prisma.FellowGetPayload<{}>[] = await new Promise(
      (resolve, reject) => {
        const parsedRows: Prisma.FellowGetPayload<{}>[] = [];
        const dataStream = Readable.from([fileBuffer]);

        dataStream
          .pipe(fastCsv.parse({ headers: true }))
          .on("data", (row) => {
            const fellowId = objectId("fellow");
            parsedRows.push({
              visibleId: fellowId,
              id: fellowId,
              createdAt: new Date(),
              updatedAt: new Date(),
              fellowName: row.fellow_name,
              cellNumber: row.cell_no,
              fellowEmail: row.email,
              supervisorId: null,
              hubId,
              implementerId: implementerId,
              yearOfImplementation: new Date().getFullYear(),
              archivedAt: null,
              mpesaName: row.mpesa_name ?? null,
              mpesaNumber: row.mpesa_number ?? null,
              idNumber: row.id_number ?? null,
              county: row.county ?? null,
              subCounty: row.sub_county ?? null,
              dateOfBirth: null,
              gender: row.gender ?? null,
              transferred: null,
              droppedOut: null,
              droppedOutAt: null,
              dropOutReason: null,
            });
          })

          .on("error", (err) => reject(err))
          .on("end", () => resolve(parsedRows));
      },
    );

    await db.$transaction(async (prisma) => {
      await prisma.fellow.createMany({ data: rows });
    });

    return NextResponse.json({
      status: 200,
      message: `${rows.length} fellows uploaded successfully.`,
    });
  } catch (error) {
    console.error("Error processing file upload:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
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
