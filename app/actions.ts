"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import * as csv from "csv-parse";

import { db } from "#/lib/db";
import { InviteUserCommand } from "#/commands/invite-user";

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
  await Promise.all(invitations);

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
  console.debug({ records });
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
