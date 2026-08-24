import type { Fellow } from "@prisma/client";
import { type NextRequest, NextResponse } from "next/server";
import { parseCsvUpload } from "#/app/api/csv-uploads/parse-csv-upload";
import { currentHubCoordinator } from "#/app/auth";
import { objectId } from "#/lib/crypto";
import { db } from "#/lib/db";

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
] as const;

export async function POST(request: NextRequest) {
  const formData = await request.formData();

  try {
    const file = formData.get("file") as File;

    const hc = await currentHubCoordinator();

    if (!hc) {
      return NextResponse.json({ error: "Hub coordinator not found." }, { status: 404 });
    }

    const hubId = hc.profile?.assignedHubId ?? (formData.get("hubId") as string);
    const implementerId = hc.profile?.implementerId ?? (formData.get("implementerId") as string);
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    let records: Record<(typeof fellowCSVHeaders)[number], string>[];
    try {
      records = parseCsvUpload(fileBuffer, fellowCSVHeaders);
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

    const rows: Fellow[] = records.map((row) => {
      const fellowId = objectId("fellow");
      return {
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
      };
    });

    await db.$transaction(async (prisma) => {
      await prisma.fellow.createMany({ data: rows });
    });

    return NextResponse.json({
      status: 200,
      message: `${rows.length} fellows uploaded successfully.`,
    });
  } catch (error) {
    console.error("Error processing file upload:", error);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
