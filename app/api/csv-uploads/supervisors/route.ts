import { Readable } from "node:stream";
import type { Prisma } from "@prisma/client";
import * as fastCsv from "fast-csv";
import { type NextRequest, NextResponse } from "next/server";
import { objectId } from "#/lib/crypto";
import { db } from "#/lib/db";

export const runtime = "nodejs";

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
];

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

    const rows: SupervisorUpploadSchema = await new Promise((resolve, reject) => {
      const parsedRows: SupervisorUpploadSchema = [];
      const dataStream = Readable.from([fileBuffer]);

      dataStream
        .pipe(fastCsv.parse({ headers: true }))
        .on("data", (row) => {
          const supervisorId = objectId("sup");

          parsedRows.push({
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
          });
        })

        .on("error", (err) => reject(err))
        .on("end", () => resolve(parsedRows));
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

async function hasRequiredHeaders(csvStream: Readable): Promise<boolean> {
  return new Promise<boolean>((resolve, reject) => {
    let headersChecked = false;
    csvStream
      .pipe(fastCsv.parse({ headers: true }))
      .on("headers", (headers) => {
        if (!headersChecked) {
          const requiredHeaders = supervisorCSVHeaders;
          const missingHeaders = requiredHeaders.filter(
            (header) => !headers.includes(header?.trim()),
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
