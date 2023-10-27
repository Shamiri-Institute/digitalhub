"use server";

import * as csv from "csv-parse";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { InviteUserCommand } from "#/commands/invite-user";
import { objectId } from "#/lib/crypto";
import { db } from "#/lib/db";
import { redirect } from "next/navigation";

export async function inviteUserToOrganization(prevState: any, formData: any) {
  const data = z
    .object({
      emails: z.string().transform((val) => val.split(",")),
      role: z.string(),
    })
    .parse({
      emails: formData.get("emails"),
      role: formData.get("role"),
    });

  // TODO: dummy values, use auth/cookies to pull this info
  const currentOrganization = await db.organization.findFirstOrThrow();
  const currentUser = await db.user.findFirstOrThrow();

  const invitations = data.emails.map(async (email) => {
    // TODO: move this to background job, don't want to creep up on serverless fx limit if alot of invites
    const inviteUser = new InviteUserCommand();
    await inviteUser.run({
      email,
      organizationId: currentOrganization.id,
      inviterId: currentUser.id,
      roleId: data.role,
    });
  });
  await Promise.allSettled(invitations);

  revalidatePath("/admin/organization/members");
}

export async function batchUploadFellows(formData: FormData) {
  const { file }: { file?: File } = z
    .object({
      file: z.any(),
    })
    .parse({
      file: formData.get("csv-file"),
    });

  if (!file) {
    throw new Error("No file provided");
  }

  const records = await parseCsvFile(file);

  // TODO: fin
  redirect("/supervisors/assignments/fellows");
}

const BATCH_FELLOW_CSV_HEADERS = [
  "Name",
  "Phone",
  "Email",
  "National ID",
  "MPESA Name",
  "MPESA Number",
  "County",
  "Sub-county",
  "Date of birth",
  "Gender",
];

async function parseCsvFile(file: File) {
  return new Promise(async (resolve, reject) => {
    const parser = csv.parse({
      delimiter: ",",
      columns: BATCH_FELLOW_CSV_HEADERS,
    });

    const records: any[] = [];
    parser.on("readable", function () {
      let record;
      while ((record = parser.read())) {
        records.push(record);
      }
    });

    parser.on("error", function (err) {
      reject(err.message);
    });

    parser.on("end", function () {
      resolve(records);
    });

    parser.write(Buffer.from(await file.arrayBuffer()));
    parser.end();
  });
}

export async function addFellow(prevState: any, formData: any) {
  const data = z
    .object({
      fellowName: z.string(),
      fellowEmail: z.string(),
      cellNumber: z.string(),
      mpesaName: z.string(),
      mpesaNumber: z.string(),
      county: z.string(),
      subCounty: z.string(),
      dateOfBirth: z.date(),
      gender: z.string(),
    })
    .parse({
      fellowName: formData.get("fellowName"),
      fellowEmail: formData.get("fellowEmail"),
      cellNumber: formData.get("cellNumber"),
      mpesaName: formData.get("mpesaName"),
      mpesaNumber: formData.get("mpesaNumber"),
      county: formData.get("county"),
      subCounty: formData.get("subCounty"),
      dateOfBirth: formData.get("dateOfBirth"),
      gender: formData.get("gender"),
    });

  console.log({ data });

  await db.fellow.create({
    data: {
      id: objectId("fellow"),
      visibleId: generateVisibleID(),
      fellowName: data.fellowName,
      fellowEmail: data.fellowEmail,
    },
  });
}
function generateVisibleID(): string {
  // Get current year
  const currentYear: number = new Date().getFullYear();

  // Extract last two digits of the current year
  let yearDigits: string = String(currentYear).slice(-2);

  // First part
  let part1: string = `TFW${yearDigits}`;

  // Second part
  let part2: string =
    Math.random() < 0.5
      ? String.fromCharCode(65 + Math.floor(Math.random() * 26)) // Generate random letter from A-Z
      : String(`00${Math.floor(Math.random() * 999)}`).slice(-3); // Zero-padding if number is less than 100

  // Third part
  let part3: string = String(`00${Math.floor(Math.random() * 999)}`).slice(-3);

  return `${part1}_${part2}_${part3}`;
}

console.log(generateVisibleID()); // Output: TFW23_S_021, TFW23_P_482, TFW23_O_123, etc.
