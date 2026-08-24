import type { Prisma } from "@prisma/client";
import { type NextRequest, NextResponse } from "next/server";
import { parseCsvUpload } from "#/app/api/csv-uploads/parse-csv-upload";
import { objectId } from "#/lib/crypto";
import { db } from "#/lib/db";

const supervisorCSVHeaders = [
  "supervisor_name",
  "cell_number",
  "personal_email",
  "id_number",
  "gender",
  "shamiri_email",
  "county",
  "sub_county",
  "mpesa_name",
  "mpesa_number",
  "training_level",
  "kra",
  "bank_name",
  "bank_branch",
  "bank_account_name",
  "bank_account_number",
] as const;

type SupervisorUpploadSchema = Prisma.SupervisorGetPayload<{
  select: {
    id: boolean;
    createdAt: boolean;
    updatedAt: boolean;
    supervisorName: boolean;
    cellNumber: boolean;
    hubId: boolean;
    personalEmail: boolean;
    supervisorEmail: boolean;
    implementerId: boolean;
    visibleId: boolean;
    county: boolean;
    subCounty: boolean;
    mpesaName: boolean;
    mpesaNumber: boolean;
    trainingLevel: boolean;
    kra: boolean;
    bankName: boolean;
    bankBranch: boolean;
    bankAccountName: boolean;
    bankAccountNumber: boolean;
    idNumber: boolean;
  };
}>[];

export async function POST(request: NextRequest) {
  const formData = await request.formData();

  try {
    const file = formData.get("file") as File;
    const hubId = formData.get("hubId") as string;
    const implementerId = formData.get("implementerId") as string;

    const fileBuffer = Buffer.from(await file.arrayBuffer());

    let records: Record<(typeof supervisorCSVHeaders)[number], string>[];
    try {
      records = parseCsvUpload(fileBuffer, supervisorCSVHeaders);
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : error },
        { status: 400 },
      );
    }

    const rows: SupervisorUpploadSchema = records.map((row) => {
      const supervisorId = objectId("sup");
      return {
        id: supervisorId,
        createdAt: new Date(),
        updatedAt: new Date(),
        supervisorName: row.supervisor_name,
        cellNumber: row.cell_number,
        hubId,
        personalEmail: row.personal_email,
        supervisorEmail: row.shamiri_email,
        implementerId,
        visibleId: supervisorId,
        county: row.county,
        subCounty: row.sub_county,
        mpesaName: row.mpesa_name,
        mpesaNumber: row.mpesa_number,
        trainingLevel: row.training_level,
        kra: row.kra,
        idNumber: row.id_number,
        bankName: row.bank_name,
        bankBranch: row.bank_branch,
        bankAccountName: row.bank_account_name,
        bankAccountNumber: row.bank_account_number,
      };
    });

    await db.$transaction(async (prisma) => {
      await prisma.supervisor.createMany({ data: rows });
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
