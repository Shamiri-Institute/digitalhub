"use server";

import {
  Fellow,
  FellowAttendance,
  Prisma,
  caseStatusOptions,
  riskStatusOptions,
} from "@prisma/client";
import * as csv from "csv-parse";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { ModifyFellowData } from "#/app/(platform)/schools/[visibleId]/fellow-modify-dialog";
import type { ModifyStudentData } from "#/app/(platform)/schools/[visibleId]/students/student-modify-dialog";
import { getCurrentUser } from "#/app/auth";
import { InviteUserCommand } from "#/commands/invite-user";
import { objectId } from "#/lib/crypto";
import { db } from "#/lib/db";
import { getHighestValue } from "#/lib/utils";
import { EditFellowSchema } from "#/lib/validators";
import { AttendanceStatus, SessionLabel, SessionNumber } from "#/types/app";

export async function inviteUserToImplementer(prevState: any, formData: any) {
  try {
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
    const currentImplementer = await db.implementer.findFirstOrThrow();
    const currentUser = await db.user.findFirstOrThrow();

    const invitations = data.emails.map(async (email) => {
      // TODO: move this to background job, don't want to creep up on serverless fx limit if alot of invites
      const inviteUser = new InviteUserCommand();
      await inviteUser.run({
        email,
        implementerId: currentImplementer.id,
        inviterId: currentUser.id,
        roleId: data.role,
      });
    });
    await Promise.allSettled(invitations);

    revalidatePath("/admin/implementer/members");

    return { message: "success" };
  } catch (e) {
    return { message: "failed" };
  }
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

export async function modifyFellow(
  data: ModifyFellowData & { mode: "create" | "edit"; schoolVisibleId: string },
) {
  try {
    if (data.mode === "create") {
      revalidatePath(`/schools/${data.schoolVisibleId}`);
      return await createFellow(data);
    } else if (data.mode === "edit") {
      revalidatePath(`/schools/${data.schoolVisibleId}`);
      return await updateFellow(data);
    } else {
      return { error: "Invalid mode" };
    }
  } catch (error: unknown) {
    console.error(error);
    return { error: "Something went wrong" };
  }
}

async function updateFellow(data: ModifyFellowData) {
  try {
    const fellow = await db.fellow.update({
      where: {
        visibleId: data.visibleId,
      },
      data: {
        id: objectId("fellow"),
        fellowName: data.fellowName,
        fellowEmail: data.fellowEmail,
        cellNumber: data.cellNumber,
        mpesaName: data.mpesaName,
        mpesaNumber: data.mpesaNumber,
        county: data.county,
        subCounty: data.subCounty,
        dateOfBirth: data.dateOfBirth,
        gender: data.gender,
      },
    });

    return { fellow };
  } catch (error: unknown) {
    console.error(error);
    return { error: "Something went wrong" };
  }
}

async function createFellow(data: ModifyFellowData) {
  try {
    const hub = await db.hub.findUniqueOrThrow({
      where: { visibleId: data.hubVisibleId },
    });
    const supervisor = await db.supervisor.findUniqueOrThrow({
      where: { visibleId: data.supervisorVisibleId },
    });
    const implementer = await db.implementer.findUniqueOrThrow({
      where: { visibleId: data.implementerVisibleId },
    });

    const fellow = await db.fellow.create({
      data: {
        id: objectId("fellow"),
        visibleId: generateFellowVisibleID(),
        hubId: hub.id,
        supervisorId: supervisor.id,
        implementerId: implementer.id,
        fellowName: data.fellowName,
        fellowEmail: data.fellowEmail,
        cellNumber: data.cellNumber,
        mpesaName: data.mpesaName,
        mpesaNumber: data.mpesaNumber,
        county: data.county,
        subCounty: data.subCounty,
        dateOfBirth: data.dateOfBirth,
        gender: data.gender,
      },
    });

    return { fellow };
  } catch (error: unknown) {
    console.error(error);
    return { error: "Something went wrong" };
  }
}

function generateFellowVisibleID(): string {
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

export async function dropoutFellowWithReason(
  fellowVisibleId: string,
  schoolVisibleId: string,
  dropoutReason: string,
) {
  try {
    const fellow = await db.fellow.update({
      where: { visibleId: fellowVisibleId },
      data: {
        droppedOut: true, // for consistency w/ old data
        droppedOutAt: new Date(),
        dropOutReason: dropoutReason,
      },
    });

    revalidatePath(`/schools/${schoolVisibleId}`);

    return { fellow };
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error(error.message);
      return {
        error: error.message,
      };
    }
    console.error(error);
    return { error: "Something went wrong" };
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

export async function markStudentAttendance(
  status: AttendanceStatus,
  label: SessionLabel,
  studentVisibleId: string,
) {
  try {
    const sessionNumber = sessionLabelToNumber(label);

    const attendanceBoolean = attendanceStatusToBoolean(status);

    switch (sessionNumber) {
      case 0:
        await db.student.update({
          where: { visibleId: studentVisibleId },
          data: {
            attendanceSession0: attendanceBoolean,
          },
        });
        break;
      case 1:
        await db.student.update({
          where: { visibleId: studentVisibleId },
          data: {
            attendanceSession1: attendanceBoolean,
          },
        });
        break;
      case 2:
        await db.student.update({
          where: { visibleId: studentVisibleId },
          data: {
            attendanceSession2: attendanceBoolean,
          },
        });
        break;
      case 3:
        await db.student.update({
          where: { visibleId: studentVisibleId },
          data: {
            attendanceSession3: attendanceBoolean,
          },
        });
        break;
      case 4:
        await db.student.update({
          where: { visibleId: studentVisibleId },
          data: {
            attendanceSession3: attendanceBoolean,
          },
        });
        break;
    }

    const student = await db.student.findUniqueOrThrow({
      where: { visibleId: studentVisibleId },
    });

    return { student };
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

export async function dropoutStudentWithReason(
  studentVisibleId: string,
  schoolVisibleId: string,
  fellowVisibleId: string,
  dropoutReason: string,
) {
  try {
    const student = await db.student.update({
      where: { visibleId: studentVisibleId },
      data: {
        droppedOut: true,
        dropOutReason: dropoutReason,
        droppedOutAt: new Date(),
      },
    });

    revalidatePath(
      `/schools/${schoolVisibleId}/students?fellowId=${fellowVisibleId}}`,
    );

    return { student };
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error(error.message);
      return {
        error: error.message,
      };
    }
    console.error(error);
    return { error: "Something went wrong" };
  }
}

export async function modifyStudent(
  data: ModifyStudentData & { mode: "create" | "edit" },
): Promise<{ error: string } | { student: Prisma.StudentGetPayload<{}> }> {
  try {
    if (data.mode === "create") {
      revalidatePath(
        `/schools/${data.schoolVisibleId}/students?fellowId=${data.fellowVisibleId}`,
      );
      return await createStudent(data);
    } else if (data.mode === "edit") {
      revalidatePath(
        `/schools/${data.schoolVisibleId}/students?fellowId=${data.fellowVisibleId}`,
      );
      return await updateStudent(data);
    } else {
      return { error: "Invalid mode" };
    }
  } catch (error: unknown) {
    console.error(error);
    return { error: "Something went wrong" };
  }
}

async function updateStudent(data: ModifyStudentData) {
  const student = await db.student.update({
    where: { visibleId: data.visibleId },
    data: {
      studentName: data.studentName,
      yearOfImplementation: data.yearOfImplementation,
      admissionNumber: data.admissionNumber,
      age: data.age ? parseInt(data.age) : null,
      gender: data.gender,
      form: parseInt(data.form),
      stream: data.stream,
      condition: data.condition,
      intervention: data.intervention,
      tribe: data.tribe,
      county: data.county,
      financialStatus: data.financialStatus,
      home: data.home,
      siblings: data.siblings,
      religion: data.religion,
      groupName: data.groupName,
      survivingParents: data.survivingParents,
      parentsDead: data.parentsDead,
      fathersEducation: data.fathersEducation,
      mothersEducation: data.mothersEducation,
      coCurricular: data.coCurricular,
      sports: data.sports,
      phoneNumber: data.phoneNumber,
      mpesaNumber: data.mpesaNumber,
    },
  });

  return { student };
}

async function createStudent(data: ModifyStudentData) {
  try {
    const fellow = await db.fellow.findUniqueOrThrow({
      where: { visibleId: data.fellowVisibleId },
    });
    const supervisor = await db.supervisor.findUniqueOrThrow({
      where: { visibleId: data.supervisorVisibleId },
    });
    const implementer = await db.implementer.findUniqueOrThrow({
      where: { visibleId: data.implementerVisibleId },
    });
    const school = await db.school.findUniqueOrThrow({
      where: { visibleId: data.schoolVisibleId },
    });

    const student = await db.student.create({
      data: {
        id: objectId("stu"),
        studentName: data.studentName,
        visibleId: generateStudentVisibleID(data.groupName),
        fellowId: fellow.id,
        supervisorId: supervisor.id,
        implementerId: implementer.id,
        schoolId: school.id,
        yearOfImplementation: data.yearOfImplementation,
        admissionNumber: data.admissionNumber,
        age: data.age ? parseInt(data.age) : null,
        gender: data.gender,
        form: parseInt(data.form),
        stream: data.stream,
        condition: data.condition,
        intervention: data.intervention,
        tribe: data.tribe,
        county: data.county,
        financialStatus: data.financialStatus,
        home: data.home,
        siblings: data.siblings,
        religion: data.religion,
        groupName: data.groupName,
        survivingParents: data.survivingParents,
        parentsDead: data.parentsDead,
        fathersEducation: data.fathersEducation,
        mothersEducation: data.mothersEducation,
        coCurricular: data.coCurricular,
        sports: data.sports,
        phoneNumber: data.phoneNumber,
        mpesaNumber: data.mpesaNumber,
      },
    });

    return { student };
  } catch (error: unknown) {
    console.error(error);
    return { error: "Something went wrong" };
  }
}

function generateStudentVisibleID(groupName: string) {
  const suffix = Math.floor(Math.random() * 90000) + 10000;
  return `${groupName}_${suffix}`;
}

export interface OccurrenceData {
  occurred: boolean;
  sessionName: string;
  sessionDate: Date;
  yearOfImplementation: number;
  sessionType: string;
  schoolId: string;
}

/**
 * This represents where the intervention session happened or will happen at all.
 *
 * Student and fellow attendance is more about the individual level the individual level.
 */
export async function toggleInterventionOccurrence(data: OccurrenceData) {
  const interventionSession = await db.interventionSession.findUnique({
    where: {
      interventionBySchoolIdAndSessionType: {
        schoolId: data.schoolId,
        sessionType: data.sessionType,
      },
    },
  });

  const { occurred } = data;
  let success = false;
  if (occurred) {
    if (interventionSession === null) {
      // TODO: if they tap a downstream session (e.g. s4) and all sessions in between is unoccurrred, mark all the in between sesssion occurred
      await db.interventionSession.create({
        data: {
          id: objectId("isess"),
          sessionName: data.sessionName,
          sessionDate: data.sessionDate,
          sessionType: data.sessionType,
          yearOfImplementation: data.yearOfImplementation,
          schoolId: data.schoolId,
          occurred,
        },
      });
      success = true;
    } else if (interventionSession.occurred === false) {
      await db.interventionSession.update({
        where: {
          interventionBySchoolIdAndSessionType: {
            schoolId: data.schoolId,
            sessionType: data.sessionType,
          },
        },
        data: { occurred },
      });
      success = true;
    } else if (interventionSession.occurred === true) {
      console.error(`Intervention session is already marked as occurring`);
    }
  } else {
    if (interventionSession === null) {
      console.error(
        `Intervention session is attempting to be unmarked but session doesn't exist`,
      );
    } else {
      await db.interventionSession.update({
        where: {
          interventionBySchoolIdAndSessionType: {
            schoolId: data.schoolId,
            sessionType: data.sessionType,
          },
        },
        data: { occurred },
      });
      success = true;
    }
  }

  return success;
}

export async function submitTransportReimbursementRequest(data: {
  supervisorId: string;
  hubId: string;
  receiptDate?: Date;
  amount: string;
  mpesaName: string;
  mpesaNumber: string;
  receiptUrl: string;
  session: string;
  destination: string;
  reason: string;
  school: string;
}) {
  try {
    if (!data.receiptDate) {
      return {
        success: false,
        error: "Please select a date",
      };
    }

    await db.reimbursementRequest.create({
      data: {
        id: objectId("reim"),
        supervisorId: data.supervisorId,
        hubId: data.hubId,
        incurredAt: data.receiptDate,
        amount: parseInt(data.amount),
        kind: "transport",
        mpesaName: data.mpesaName,
        mpesaNumber: data.mpesaNumber,
        details: {
          subtype: data.reason,
          receiptUrl: data.receiptUrl,
          session: data.session,
          destination: data.destination,
          school: data.school,
        },
      },
    });

    return {
      success: true,
    };
  } catch (error: unknown) {
    console.error(error);
    return {
      success: false,
      error: "Something went wrong",
    };
  }
}

export async function updateInterventionOccurrenceDate(
  data: Pick<OccurrenceData, "sessionDate" | "sessionType" | "schoolId">,
) {
  try {
    const result = await db.interventionSession.update({
      where: {
        interventionBySchoolIdAndSessionType: {
          schoolId: data.schoolId,
          sessionType: data.sessionType,
        },
      },
      data: {
        sessionDate: data.sessionDate,
      },
    });

    console.log({ result });

    return true;
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // https://www.prisma.io/docs/reference/api-reference/error-reference#p2025
      if (error.code === "P2025") {
        console.error(`Intervention session doesn't exist`);
      }
      return false;
    }

    console.error({ error });
    throw error;
  }
}

export async function revalidateFromClient(path: string) {
  revalidatePath(path);
}

export async function dropoutSchoolWithReason(
  schoolVisibleId: string,
  dropoutReason: string,
) {
  try {
    const school = await db.school.update({
      where: { visibleId: schoolVisibleId },
      data: {
        droppedOut: true,
        dropoutReason: dropoutReason,
      },
    });

    return { school };
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error(error.message);
      return {
        error: error.message,
      };
    }
    console.error(error);
    return { error: "Something went wrong" };
  }
}

export async function rateSession(payload: {
  kind: "student-behavior" | "admin-support" | "workload";
  rating: number;
  sessionId: string;
  supervisorId: string;
}) {
  const ratings: {
    studentBehaviorRating?: number;
    adminSupportRating?: number;
    workloadRating?: number;
  } = {
    studentBehaviorRating: undefined,
    adminSupportRating: undefined,
    workloadRating: undefined,
  };

  switch (payload.kind) {
    case "student-behavior":
      ratings.studentBehaviorRating = payload.rating;
      break;
    case "admin-support":
      ratings.adminSupportRating = payload.rating;
      break;
    case "workload":
      ratings.workloadRating = payload.rating;
      break;
    default:
      throw new Error("Unhandled rating kind");
  }

  try {
    await db.interventionSessionRating.upsert({
      where: {
        ratingBySessionIdAndSupervisorId: {
          sessionId: payload.sessionId,
          supervisorId: payload.supervisorId,
        },
      },
      create: {
        id: objectId("isr"),
        sessionId: payload.sessionId,
        supervisorId: payload.supervisorId,
        studentBehaviorRating: ratings.studentBehaviorRating,
        adminSupportRating: ratings.adminSupportRating,
        workloadRating: ratings.workloadRating,
      },
      update: {
        sessionId: payload.sessionId,
        supervisorId: payload.supervisorId,
        studentBehaviorRating: ratings.studentBehaviorRating,
        adminSupportRating: ratings.adminSupportRating,
        workloadRating: ratings.workloadRating,
      },
    });
    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false };
  }
}

export async function saveReport({
  sessionId,
  supervisorId,
  positiveHighlights,
  reportedChallenges,
  recommendations,
}: {
  sessionId: string;
  supervisorId: string;
  positiveHighlights: string;
  reportedChallenges: string;
  recommendations: string;
}) {
  try {
    await db.$transaction(async (tx) => {
      const entries = [
        { kind: "positive-highlights", content: positiveHighlights },
        { kind: "reported-challenges", content: reportedChallenges },
        { kind: "recommendations", content: recommendations },
      ];
      for (const { kind, content } of entries) {
        const row = await tx.interventionSessionNote.findFirst({
          where: { sessionId, supervisorId, kind },
        });

        if (row) {
          await tx.interventionSessionNote.update({
            where: { id: row.id },
            data: { sessionId, supervisorId, kind, content },
          });
        } else {
          await tx.interventionSessionNote.create({
            data: { sessionId, supervisorId, kind, content },
          });
        }
      }
    });

    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false };
  }
}

export async function addNote({
  sessionId,
  supervisorId,
  content,
}: {
  sessionId: string;
  supervisorId: string;
  content: string;
}) {
  try {
    await db.interventionSessionNote.create({
      data: { sessionId, supervisorId, kind: "added-notes", content },
    });
    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false };
  }
}

export async function selectPersonnel({ identifier }: { identifier: string }) {
  console.log("selectPersonnel", { identifier });
  const user = await getCurrentUser();
  if (!user) {
    return null;
  }
  const { membership } = user;
  await db.implementerMember.update({
    where: { id: membership.id },
    data: { identifier },
  });
}

export async function updateLoggedInSupervisorDetails(
  visibleId: string,
  data: {
    bankAccountNumber?: string;
    bankAccountHolder?: string;
    bankBranch?: string;
    bankName?: string;
    cellNumber?: string;
    county?: string;
    dateOfBirth?: Date;
    idNumber?: string;
    kra?: string;
    mpesaName?: string;
    mpesaNumber?: string;
    nhif?: string;
    nssf?: string;
    subCounty?: string;
    supervisorEmail?: string;
    gender?: string;
  },
) {
  try {
    const supervisor = await db.supervisor.findUnique({
      where: { visibleId },
    });

    if (!supervisor) {
      throw new Error("Supervisor not found");
    }

    const updatedSupervisor = await db.supervisor.update({
      where: { visibleId },
      data: {
        ...data,
      },
    });
    return { supervisor: updatedSupervisor };
  } catch (error) {
    console.error(error);
    return { error: "Something went wrong" };
  }
}

export async function updateAssignedSchoolDetails(
  schoolVisibleId: string,
  data: {
    numbersExpected?: number;
    pointPersonName?: string;
    pointPersonEmail?: string;
    pointPersonPhone?: string;
    schoolEmail?: string;
    schoolCounty?: string;
    schoolDemographics?: string;
    boardingDay?: string;
    schoolType?: string;
  },
) {
  try {
    const school = await db.school.update({
      where: { visibleId: schoolVisibleId },
      data: {
        ...data,
      },
    });

    return { school };
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error(error.message);
      return {
        error: "Something went wrong",
      };
    }
    console.error(error);
    return { error: "Something went wrong" };
  }
}

export async function editFellowDetails(
  fellowDetails: Pick<
    Fellow,
    | "id"
    | "fellowName"
    | "dateOfBirth"
    | "mpesaNumber"
    | "gender"
    | "county"
    | "subCounty"
    | "mpesaName"
    | "cellNumber"
  >,
) {
  const result = EditFellowSchema.safeParse(fellowDetails);

  if (!result.success) {
    throw new Error(
      "Invalid fields supplied, please review submission details",
    );
  }

  const { data: parsedFellow } = result;

  try {
    await db.fellow.update({
      where: {
        id: parsedFellow.id,
      },
      data: parsedFellow,
    });
    revalidatePath("/profile");
    return { success: true };
  } catch (e) {
    return { success: false, error: "Something went wrong" };
  }
}

export async function getSchoolsByHubId(hubId: string) {
  try {
    const schools = await db.school.findMany({
      where: {
        hubId,
      },
    });
    return { schools };
  } catch (e) {
    console.error(e);
    return { error: "Something went wrong" };
  }
}

export async function submitRepaymentRequest(data: {
  supervisorId: string;
  fellowId: string;
  hubId: string;
  groupSessionId: string;
}) {
  try {
    console.log({ data });
    await db.repaymentRequest.create({
      data: {
        id: objectId("repay"),
        supervisorId: data.supervisorId,
        fellowId: data.fellowId,
        hubId: data.hubId,
        groupSessionId: data.groupSessionId,
      },
    });
    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false, error: "Something went wrong" };
  }
}

export async function AcceptRefferedClinicalCase(
  currentSupervisorId: string,
  referredToSupervisorId: string | null,
  caseId: string,
) {
  try {
    const currentcase = await db.clinicalScreeningInfo.update({
      where: {
        id: caseId,
      },
      data: {
        currentSupervisorId: currentSupervisorId,
        referredToSupervisorId: null,
        acceptCase: true,
        caseTransferTrail: {
          //TODO: ADJUST to correct data
          create: {
            from: currentSupervisorId,
            fromRole: "Supervisor",
            to: referredToSupervisorId ?? "",
            toRole: "Supervisor",
            date: new Date(),
          },
        },
      },
    });

    revalidatePath("/screenings");

    return { success: true, data: currentcase };
  } catch (error) {
    console.error(error);
    return { error: "Something went wrong" };
  }
}

export async function RejectRefferedClinicalCase(caseId: string) {
  try {
    const currentcase = await db.clinicalScreeningInfo.update({
      where: {
        id: caseId,
      },
      data: {
        referredToSupervisorId: null,
        acceptCase: false,
      },
    });

    revalidatePath("/screenings");
    return { success: true, data: currentcase };
  } catch (error) {
    console.error(error);
    return { error: "Something went wrong" };
  }
}

export async function updateClinicalCaseStatus(
  caseId: string,
  status: caseStatusOptions,
) {
  try {
    await db.clinicalScreeningInfo.update({
      where: {
        id: caseId,
      },
      data: {
        caseStatus: status,
      },
    });
    revalidatePath("/screenings");
    return { success: true };
  } catch (error) {
    console.error(error);
    return { error: "Something went wrong" };
  }
}

export async function updateClinicalCaseGeneralPresentingIssue(
  caseId: string,
  presentingIssue: string,
  presentingIssueOtherSpecified: string,
) {
  try {
    await db.clinicalScreeningInfo.update({
      where: {
        id: caseId,
      },
      data: {
        generalPresentingIssues: presentingIssue,
        generalPresentingIssuesOtherSpecified: presentingIssueOtherSpecified,
      },
    });
    revalidatePath("/screenings");
    return { success: true };
  } catch (error) {
    console.error(error);
    return { error: "Something went wrong" };
  }
}

export async function referClinicalCaseSupervisor(data: {
  caseId: string;
  referredTo: string;
  referredToPerson: string | null;
  referredFrom: string;
  referralNotes: string;
  referredFromSpecified: string;
  supervisorName: string;
  externalCare?: string | null;
}) {
  try {
    await db.clinicalScreeningInfo.update({
      where: {
        id: data.caseId,
      },
      data: {
        referredFrom: data.referredFrom,
        referredFromSpecified: data.supervisorName,
        referredTo: data.referredTo,
        referredToSpecified: data.referredToPerson ?? data.externalCare,
        referralNotes: data.referralNotes,
        referredToSupervisorId: data.referredToPerson ?? null,
        caseTransferTrail: {
          create: {
            from: data.referredFromSpecified ?? "",
            fromRole: data.referredFrom,
            // to: data.referredToPerson,
            to: data.supervisorName,
            toRole: data.referredTo,
            date: new Date(),
          },
        },
        acceptCase: false,
      },
    });

    revalidatePath("/screenings");
    return { success: true };
  } catch (error) {
    console.error(error);
    return { error: "Something went wrong" };
  }
}

export async function initialReferralFromClinicalCaseSupervisor(data: {
  caseId: string;
  referredFrom: string;
  referredFromSpecified: string;
  referredTo: string;
  referredToSpecified: string;
  supervisorId: string;
  initialCaseId?: string;
}) {
  try {
    if (data.initialCaseId) {
      await db.clinicalScreeningInfo.update({
        where: {
          id: data.caseId,
        },
        data: {
          referredFrom: data.referredFrom,
          referredFromSpecified: data.referredFromSpecified,
          referredTo: data.referredTo,
          referredToSpecified: data.referredToSpecified,
          caseTransferTrail: {
            update: {
              where: {
                id: data.initialCaseId,
              },
              data: {
                from: data.referredFromSpecified ?? "",
                fromRole: data.referredFrom,
                to: data.referredToSpecified,
                toRole: data.referredTo,
                date: new Date(),
              },
            },
          },
        },
      });
    } else {
      const currentcase = await db.clinicalScreeningInfo.update({
        where: {
          id: data.caseId,
        },
        data: {
          referredFrom: data.referredFrom,
          referredFromSpecified: data.referredToSpecified,

          initialCaseHistoryOwnerId: data.supervisorId,

          caseTransferTrail: {
            create: {
              from: data.referredFromSpecified ?? "",
              fromRole: data.referredFrom,
              to: data.referredTo,
              toRole: data.referredToSpecified,
              date: new Date(),
            },
          },
          acceptCase: false,
        },
        include: {
          caseTransferTrail: {
            select: {
              id: true,
            },
          },
        },
      });

      if (currentcase?.caseTransferTrail.length > 0) {
        const initialCaseHistoryId =
          currentcase?.caseTransferTrail[0]?.id ?? null;

        await db.clinicalScreeningInfo.update({
          where: {
            id: data.caseId,
          },
          data: {
            initialCaseHistoryId: initialCaseHistoryId,
          },
        });
      }
    }

    revalidatePath("/screenings");
    return { success: true };
  } catch (error) {
    console.error(error);
    return { error: "Something went wrong" };
  }
}

export async function supConsultClinicalexpert(data: {
  caseId: string;
  name: string;
  comment: string;
}) {
  try {
    await db.clinicalScreeningInfo.update({
      where: {
        id: data.caseId,
      },
      data: {
        consultingClinicalExpert: {
          create: {
            comment: data.comment,
            name: data.name,
          },
        },
      },
    });
    revalidatePath("/screenings");
    return { success: true };
  } catch (error) {
    console.error(error);
    return { error: "Something went wrong" };
  }
}

export async function updateClinicalCaseEmergencyPresentingIssue(data: {
  caseId: string;
  presentingIssues: { [k: string]: string };
}) {
  try {
    const result_data = await db.clinicalScreeningInfo.findUnique({
      where: {
        id: data.caseId,
      },
    });

    const emergencyPresentingIssues =
      result_data?.emergencyPresentingIssues ?? {};

    let combinedPresentingIssues = {
      // ...(emergencyPresentingIssues as { [k: string]: string }),
      ...(emergencyPresentingIssues as Record<string, any>),
      ...data.presentingIssues,
    };

    const highestValue: riskStatusOptions = getHighestValue(
      combinedPresentingIssues,
    );

    await db.clinicalScreeningInfo.update({
      where: {
        id: data.caseId,
      },
      data: {
        emergencyPresentingIssues: {
          ...combinedPresentingIssues,
        },
        ...(highestValue && { riskStatus: highestValue }),
      },
    });

    revalidatePath("/screenings");
    return { success: true };
  } catch (error) {
    console.error(error);
    return { error: "Something went wrong" };
  }
}

export async function updateClinicalCaseSessionAttendance(data: {
  caseId: string;
  session: string;
  supervisorId: string;
  dateOfSession: Date;
}) {
  try {
    await db.clinicalScreeningInfo.update({
      where: {
        id: data.caseId,
      },
      data: {
        sessions: {
          create: {
            date: data.dateOfSession,
            session: data.session,
            supervisorId: data.supervisorId,
          },
        },
      },
    });

    revalidatePath("/screenings");
    return { success: true };
  } catch (error) {
    console.error(error);
    return { error: "Something went wrong" };
  }
}

export async function createClinicalCase(data: {
  studentId: string;
  schoolId: string;
  currentSupervisorId: string;
}) {
  try {
    const result = await db.clinicalScreeningInfo.create({
      data: {
        studentId: data.studentId,
        schoolId: data.schoolId,
        currentSupervisorId: data.currentSupervisorId,
        flagged: false,
        riskStatus: "No",
        caseStatus: "Active",
      },
    });

    revalidatePath("/screenings");
    return { success: true, data: result };
  } catch (error) {
    console.error(error);
    return { error: "Something went wrong" };
  }
}

export async function flagClinicalCaseForFollowUp(data: {
  caseId: string;
  reason: string;
}) {
  try {
    await db.clinicalScreeningInfo.update({
      where: {
        id: data.caseId,
      },
      data: {
        flagged: true,
        caseReport: data.reason,
      },
    });

    revalidatePath("/screenings");
    return { success: true };
  } catch (error) {
    return { error: "Something went wrong" };
  }
}
