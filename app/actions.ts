"use server";

import * as csv from "csv-parse";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { InviteUserCommand } from "#/commands/invite-user";
import { objectId } from "#/lib/crypto";
import { db } from "#/lib/db";
import { AttendanceStatus, SessionLabel, SessionNumber } from "#/types/app";
import { FellowAttendance } from "@prisma/client";
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

export async function addFellow(prevState: any, formDataObject: any) {
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
      hubId: z.string(),
      supervisorId: z.string(),
      implementerId: z.string(),
    })
    .parse(formDataObject);

  console.log({ data });

  await db.fellow.create({
    data: {
      id: objectId("fellow"),
      visibleId: generateVisibleID(),
      fellowName: data.fellowName,
      fellowEmail: data.fellowEmail,
      cellNumber: data.cellNumber,
      mpesaName: data.mpesaName,
      mpesaNumber: data.mpesaNumber,
      county: data.county,
      subCounty: data.subCounty,
      dateOfBirth: data.dateOfBirth,
      gender: data.gender,
      hubId: data.hubId,
      supervisorId: data.supervisorId,
      implementerId: data.implementerId,
    },
  });

  revalidatePath(`/schools/${data.schoolId}`);
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

export async function markFellowAttendance(
  status: AttendanceStatus,
  label: SessionLabel,
  fellowVisibleId: string,
  schoolVisibleId: string,
) {
  try {
    const fellow = await db.fellow.findUniqueOrThrow({
      where: { visibleId: fellowVisibleId },
    });

    if (!fellow.supervisorId) {
      throw new Error(`Fellow (${fellow.visibleId}) has no supervisor`);
    }

    const school = await db.school.findUniqueOrThrow({
      where: { visibleId: schoolVisibleId },
    });

    const sessionNumber = sessionLabelToNumber(label);

    const fellowAttendance = await db.fellowAttendance.findFirst({
      where: {
        fellowId: fellow.id,
        sessionNumber,
      },
    });

    let attendance: FellowAttendance | null = null;
    if (fellowAttendance) {
      attendance = await db.fellowAttendance.update({
        where: {
          id: fellowAttendance.id,
        },
        data: {
          sessionNumber,
          attended: attendanceStatusToBoolean(status),
        },
      });
    } else {
      attendance = await db.fellowAttendance.create({
        data: {
          fellowId: fellow.id,
          visibleId: generateFellowAttendanceVisibleId(
            fellow.visibleId,
            schoolVisibleId,
            label,
          ),
          yearOfImplementation: new Date().getFullYear(),
          sessionNumber: sessionNumber as number,
          // TODO: remove this as we need a way to know the date of the session (see introduced intervention_sessions)
          sessionDate: new Date(),
          attended: attendanceStatusToBoolean(status),
          schoolId: school.id,
          supervisorId: fellow.supervisorId,
        },
      });
    }

    return {
      attendance,
    };
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error(error.message);
      return {
        error: error.message,
      };
    }
    console.error(error);
    return {
      error: "Something went wrong",
    };
  }
}

function generateFellowAttendanceVisibleId(
  fellowId: string,
  schoolId: string,
  sessionLabel: string,
) {
  const randomString = Math.random().toString(36).substring(7);
  return `${fellowId}_${schoolId}_${sessionLabel}_${randomString}`;
}

function attendanceStatusToBoolean(status: AttendanceStatus): boolean | null {
  switch (status) {
    case "present":
      return true;
    case "absent":
      return false;
    case "not-marked":
      return null;
    default:
      throw new Error("Invalid attendance status");
  }
}

function sessionLabelToNumber(label: SessionLabel): SessionNumber {
  switch (label) {
    case "Pre":
      return 0;
    case "S1":
      return 1;
    case "S2":
      return 2;
    case "S3":
      return 3;
    case "S4":
      return 4;
    default:
      throw new Error("Invalid session label");
  }
}
