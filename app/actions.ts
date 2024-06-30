"use server";

import {
  Fellow,
  FellowAttendance,
  ImplementerRole,
  Prisma,
  WeeklyFellowRatings,
  caseStatusOptions,
  riskStatusOptions,
} from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { ModifyFellowData } from "#/app/(platform)/schools/[visibleId]/fellow-modify-dialog";
import type { ModifyStudentData } from "#/app/(platform)/schools/[visibleId]/students/student-modify-dialog";
import { getCurrentUser } from "#/app/auth";
import { InviteUserCommand } from "#/commands/invite-user";
import {
  CURRENT_PROJECT_ID,
  SHOW_DUPLICATE_ID_CHECKBOX,
} from "#/lib/constants";
import { objectId } from "#/lib/crypto";
import { db } from "#/lib/db";
import { getHighestValue } from "#/lib/utils";
import { EditFellowSchema } from "#/lib/validators";
import { AttendanceStatus, SessionLabel, SessionNumber } from "#/types/app";
import {
  MAIN_SESSION_COMPENSATION,
  PRE_SESSION_COMPENSATION,
} from "./api/payouts/generate/payout-utils";

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

    // TODO: Let's track this as a serial number on implementer
    const fellowsCreatedThisYearCount = await db.fellow.count({
      where: {
        createdAt: {
          gte: new Date(new Date().getFullYear(), 0, 1),
        },
      },
    });

    const fellow = await db.fellow.create({
      data: {
        id: objectId("fellow"),
        visibleId: generateFellowVisibleID(fellowsCreatedThisYearCount),
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

function generateFellowVisibleID(lastNumber: number): string {
  // Get current year
  const currentYear: number = new Date().getFullYear();

  // Extract last two digits of the current year
  let yearDigits: string = String(currentYear).slice(-2);

  // First part
  let part1: string = `TFW${yearDigits}`;

  // Second part
  let part2: string = "S";

  // Third part
  const newNumber = lastNumber + 1;
  let part3: string = newNumber.toString().padStart(3, "0");
  if (newNumber >= 1000) {
    part3 = newNumber.toString().padStart(4, "0");
  }

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
      include: {
        interventionSessions: true,
        interventionGroups: true,
        assignedSupervisor: true,
      },
    });

    const sessionNumber = sessionLabelToNumber(label);
    const interventionSession = school.interventionSessions.find(
      (session) => session.sessionType === `s${sessionNumber}`,
    );
    if (!interventionSession) {
      throw new Error("Intervention session not found");
    }
    if (interventionSession.occurred !== true) {
      return {
        error: `Session ${label} is marked as not occurred. Please contact the assigned supervisor for ${school.schoolName} (${school.assignedSupervisor?.supervisorName}) to mark the session as occurred before marking attendance.`,
      };
    }

    const interventionGroup =
      school.interventionGroups.find((group) => group.leaderId === fellow.id) ??
      null;

    const fellowAttendance = await db.fellowAttendance.findFirst({
      where: {
        fellowId: fellow.id,
        sessionNumber,
        schoolId: school.id,
        sessionId: interventionSession.id,
        groupId: interventionGroup?.id ?? null,
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

      const payout = await db.payoutStatements.findFirst({
        where: {
          fellowAttendanceId: attendance.id,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      if (payout) {
        await db.payoutStatements.create({
          data: {
            reason: "reconciliation",
            fellowAttendanceId: attendance.id,
            amount: attendanceStatusToBoolean(status)
              ? payout.amount
              : -payout.amount,
            mpesaNumber: fellow.mpesaNumber,
            createdBy: attendance.supervisorId,
          },
        });
      }
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
          sessionDate: interventionSession.sessionDate,
          attended: attendanceStatusToBoolean(status),
          schoolId: school.id,
          supervisorId: fellow.supervisorId,
          sessionId: interventionSession.id,
          groupId: interventionGroup?.id ?? null,
          projectId: CURRENT_PROJECT_ID,
        },
      });

      if (attendanceStatusToBoolean(status)) {
        const sessionType = `s${sessionNumber}`;
        const compensation =
          sessionType === "s0"
            ? PRE_SESSION_COMPENSATION
            : MAIN_SESSION_COMPENSATION;
        await db.payoutStatements.create({
          data: {
            reason: "session_attendance",
            fellowAttendanceId: attendance.id,
            amount: compensation,
            createdBy: fellow.supervisorId,
            mpesaNumber: fellow.mpesaNumber,
          },
        });
      }
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
  dropoutReason: string,
  revalidationPath: string,
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

    revalidatePath(revalidationPath);
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

export async function undropoutFellow(
  fellowVisibleId: string,
  revalidationPath: string,
) {
  try {
    const fellow = await db.fellow.update({
      where: { visibleId: fellowVisibleId },
      data: {
        droppedOut: false,
        droppedOutAt: null,
        dropOutReason: null,
      },
    });

    revalidatePath(revalidationPath);
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

export async function markStudentAttendance({
  status,
  label,
  studentVisibleId,
  schoolVisibleId,
  groupId,
  fellowId,
}: {
  status: AttendanceStatus;
  label: SessionLabel;
  studentVisibleId: string;
  schoolVisibleId: string;
  groupId?: string;
  fellowId: string;
}) {
  try {
    const attendanceBoolean = attendanceStatusToBoolean(status);

    const student = await db.student.findUniqueOrThrow({
      where: { visibleId: studentVisibleId },
    });

    const school = await db.school.findUniqueOrThrow({
      where: { visibleId: schoolVisibleId },
      include: {
        interventionSessions: true,
        interventionGroups: true,
        assignedSupervisor: true,
      },
    });

    const sessionNumber = sessionLabelToNumber(label);
    const interventionSession = school.interventionSessions.find(
      (session) => session.sessionType === `s${sessionNumber}`,
    );
    if (!interventionSession) {
      throw new Error("Intervention session not found");
    }
    if (interventionSession.occurred !== true) {
      return {
        error: `Session ${label} is marked as not occurred. Please contact the assigned supervisor for ${school.schoolName} (${school.assignedSupervisor?.supervisorName}) to mark the session as occurred before marking attendance.`,
      };
    }

    let attendance = await db.studentAttendance.findFirst({
      where: {
        studentId: student.id,
        schoolId: school.id,
        sessionId: interventionSession.id,
        groupId: groupId,
      },
    });
    if (attendance) {
      attendance = await db.studentAttendance.update({
        where: {
          id: attendance.id,
        },
        data: {
          attended: attendanceBoolean,
        },
      });
    } else {
      attendance = await db.studentAttendance.create({
        data: {
          projectId: CURRENT_PROJECT_ID,
          studentId: student.id,
          schoolId: school.id,
          sessionId: interventionSession.id,
          attended: attendanceBoolean,
          fellowId,
        },
      });
    }

    await legacyUpdateStudentAttendance(
      sessionNumber,
      studentVisibleId,
      attendanceBoolean,
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
    return {
      error: "Something went wrong",
    };
  }
}

// This is the legacy way of updating student attendance and will be deprecated
async function legacyUpdateStudentAttendance(
  sessionNumber: number,
  studentVisibleId: string,
  attendanceBoolean: boolean | null,
) {
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
): Promise<
  | { error: string }
  | { error: string; action: typeof SHOW_DUPLICATE_ID_CHECKBOX }
  | { student: Prisma.StudentGetPayload<{}> }
> {
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

async function updateStudent(
  data: ModifyStudentData,
): Promise<{ error: string } | { student: Prisma.StudentGetPayload<{}> }> {
  try {
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
        county: data.county,
        phoneNumber: data.phoneNumber,
      },
    });

    return { student };
  } catch (error: unknown) {
    console.error(error);
    return { error: "Something went wrong during student update" };
  }
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

    const group = await db.interventionGroup.findUnique({
      where: { id: data.groupId ?? "" },
    });

    const duplicateStudent = await db.student.findFirst({
      where: {
        schoolId: school.id,
        admissionNumber: data.admissionNumber,
      },
      include: {
        assignedGroup: true,
      },
    });
    if (duplicateStudent && !data.isDuplicateAdmissionNumber) {
      if (!data.isTransfer) {
        return {
          error: `Duplicate admission number (Name: ${duplicateStudent.studentName}, Admission number: ${duplicateStudent.admissionNumber}, Form: ${duplicateStudent.form}, Stream: ${duplicateStudent.stream}, Group: ${duplicateStudent.assignedGroup?.groupName ?? "N/A"}) Mark as a student transfer from a different group if applicable. Or mark if the student shares an admission number with another student in the school.`,
          action: SHOW_DUPLICATE_ID_CHECKBOX,
        };
      }

      if (!data.groupId) {
        return {
          error: "Fellow is not leader of a group to transfer student to.",
        };
      }

      const newGroup = await db.interventionGroup.findUnique({
        where: { id: data.groupId },
      });
      if (!newGroup) {
        return {
          error: "Group not found",
        };
      }

      if (!newGroup.leaderId) {
        return {
          error: `New group (${newGroup.groupName}) does not have a leader`,
        };
      }

      const student = await db.student.update({
        where: {
          id: duplicateStudent.id,
        },
        data: {
          fellowId: newGroup.leaderId,
          assignedGroupId: newGroup.id,
        },
      });

      await db.studentGroupTransferTrail.create({
        data: {
          currentGroupId: newGroup.id,
          studentId: student.id,
          fromGroupId: duplicateStudent.assignedGroupId,
        },
      });

      return { student };
    } else if (data.isTransfer) {
      return {
        error:
          "Could not find student with the same admission number to transfer",
      };
    }

    const studentCount = await db.student.count();
    const studentVisibleId = generateStudentVisibleID(
      group?.groupName ?? "NA",
      studentCount,
    );

    const student = await db.student.create({
      data: {
        id: objectId("stu"),
        studentName: data.studentName,
        visibleId: studentVisibleId,
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
        county: data.county,
        phoneNumber: data.phoneNumber,
        assignedGroupId: data.groupId,
      },
    });

    return { student };
  } catch (error: unknown) {
    console.error(error);
    return { error: "Something went wrong during student creation" };
  }
}

function generateStudentVisibleID(groupName: string, lastNumber: number) {
  return `${groupName}_${lastNumber}`;
}

export interface OccurrenceData {
  occurred: boolean;
  sessionName: string;
  sessionDate: Date;
  yearOfImplementation: number;
  sessionType: string;
  schoolId: string;
  schoolVisibleId: string;
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
      await db.interventionSession.create({
        data: {
          id: objectId("isess"),
          sessionName: data.sessionName,
          sessionDate: data.sessionDate,
          sessionType: data.sessionType,
          yearOfImplementation: data.yearOfImplementation,
          schoolId: data.schoolId,
          occurred,
          projectId: CURRENT_PROJECT_ID,
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
  receiptFileKey?: string;
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
          receiptFileKey: data.receiptFileKey,
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

    revalidatePath("/profile");
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

export async function undoSchoolDropout(schoolVisibleId: string) {
  try {
    const school = await db.school.update({
      where: { visibleId: schoolVisibleId },
      data: {
        droppedOut: false,
      },
    });

    revalidatePath("/profile");
    return { success: true, school };
  } catch (error) {
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

export async function selectPersonnel({
  identifier,
  role,
}: {
  identifier: string;
  role: ImplementerRole;
}) {
  console.log("updating personnel role", { identifier, role });
  const user = await getCurrentUser();
  if (!user) {
    return null;
  }
  const { membership } = user;
  await db.implementerMember.update({
    where: { id: membership.id },
    data: { identifier, role },
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
    revalidatePath("/profile/myschool?sid=" + school?.visibleId);
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
    | "idNumber"
    | "fellowEmail"
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
  fellowAttendanceId: number;
}) {
  try {
    console.log({ data });
    await db.repaymentRequest.create({
      data: {
        id: objectId("repay"),
        supervisorId: data.supervisorId,
        fellowId: data.fellowId,
        hubId: data.hubId,
        fellowAttendanceId: data.fellowAttendanceId,
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
    const caseHistory = await db.clinicalCaseTransferTrail.findFirst({
      where: {
        caseId: caseId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const caseHistoryId = caseHistory?.id;

    const currentcase = await db.clinicalScreeningInfo.update({
      where: {
        id: caseId,
      },

      data: {
        currentSupervisorId: currentSupervisorId,
        referredToSupervisorId: null,
        acceptCase: true,
        referralStatus: null,
        caseTransferTrail: {
          update: {
            where: {
              id: caseHistoryId,
            },
            data: {
              referralStatus: "Approved",
            },
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
    const caseHistory = await db.clinicalCaseTransferTrail.findFirst({
      where: {
        caseId: caseId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const caseHistoryId = caseHistory?.id;

    const currentcase = await db.clinicalScreeningInfo.update({
      where: {
        id: caseId,
      },
      data: {
        referredToSupervisorId: null,
        acceptCase: false,
        referralStatus: "Declined",
        caseTransferTrail: {
          update: {
            where: {
              id: caseHistoryId,
            },
            data: {
              referralStatus: "Declined",
            },
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
  presentingIssue: { [k: string]: boolean },
  presentingIssueOtherSpecified: string,
) {
  try {
    await db.clinicalScreeningInfo.update({
      where: {
        id: caseId,
      },
      data: {
        ...presentingIssue,
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

export async function updateClinicalCaseGeneralPresentingIssueOtherField(
  caseId: string,
  presentingIssueOtherSpecified: string,
) {
  try {
    await db.clinicalScreeningInfo.update({
      where: {
        id: caseId,
      },
      data: {
        generalPresentingIssuesOtherSpecified: presentingIssueOtherSpecified,
      },
    });
    revalidatePath(`/screenings/${caseId}`);
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
        referralStatus: "Pending",
        caseTransferTrail: {
          create: {
            from: data.referredFromSpecified ?? "",
            fromRole: data.referredFrom,
            to: data.supervisorName,
            toRole: data.referredTo,
            date: new Date(),
            referralStatus: "Pending",
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
          initialReferredFrom: data.referredFrom,
          initialReferredFromSpecified: data.referredFromSpecified ?? "",
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
    return { success: false, error: "Something went wrong" };
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
        flaggedReason: data.reason,
      },
    });

    revalidatePath("/screenings");
    return { success: true };
  } catch (error) {
    return { error: "Something went wrong" };
  }
}

export async function storeSupervisorProgressNotes(
  caseId: string,
  documentURL: string,
) {
  try {
    await db.clinicalScreeningInfo.update({
      where: {
        id: caseId,
      },
      data: {
        progressNotes: documentURL,
      },
    });
    return { success: true, data: documentURL };
  } catch (error) {
    console.error(error);
    return { success: false, error: "Something went wrong" };
  }
}

export async function rateGroup(payload: {
  key:
    | "engagement1"
    | "engagement2"
    | "engagement3"
    | "engagementComment"
    | "cooperation1"
    | "cooperation2"
    | "cooperation3"
    | "cooperationComment"
    | "content"
    | "contentComment";
  rating: number | string;
  groupId: string;
  id: string | undefined;
  path: string;
  isAllSessionsEvaluation?: boolean;
}) {
  try {
    // todo: to be updated once the all session eveluation is done
    if (!payload.id) {
      await db.interventionGroupReport.create({
        data: {
          id: objectId("ige"),
          groupId: payload.groupId,
          [payload.key]: payload.rating,
          isAllReport: payload.isAllSessionsEvaluation,
        },
      });
    } else {
      await db.interventionGroupReport.update({
        where: {
          id: payload.id,
        },
        data: {
          [payload.key]: payload.rating,
          isAllReport: payload.isAllSessionsEvaluation,
        },
      });
    }
    revalidatePath(payload.path);
    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false, error: "Something went wrong" };
  }
}

export async function addNonShamiriStudentViaClinicalScreening(
  data: {
    studentName: string;
    admissionNumber: string;
    age: string;
    county: string;
    form: string;
    contactNumber?: string;
    stream: string;
    gender: string;
    schoolId: string;
    studentGroup?: string;
  },
  {
    implementerId,
    supervisorId,
  }: {
    implementerId: string;
    supervisorId: string;
  },
) {
  try {
    const duplicateStudent = await db.student.findFirst({
      where: {
        schoolId: data.schoolId,
        admissionNumber: data.admissionNumber,
      },
    });

    if (duplicateStudent) {
      return {
        success: false,
        error: `Duplicate student record (Name: ${duplicateStudent.studentName}, Admission number: ${duplicateStudent.admissionNumber}, Form: ${duplicateStudent.form}, Stream: ${duplicateStudent.stream}. This student already exists.`,
      };
    }

    const studentCount = await db.student.count();
    const studentVisibleId = generateStudentVisibleID("CLN", studentCount);

    const student = await db.student.create({
      data: {
        id: objectId("stu"),
        studentName: data.studentName,
        visibleId: studentVisibleId,
        supervisorId: supervisorId,
        implementerId: implementerId,
        schoolId: data.schoolId,
        yearOfImplementation: new Date().getFullYear(),
        admissionNumber: data.admissionNumber,
        age: parseInt(data.age),
        gender: data.gender,
        form: parseInt(data.form),
        stream: data.stream,
        county: data.county,
        phoneNumber: data.contactNumber,
        isClinicalCase: true,
        groupName: data.studentGroup,
      },
    });

    await createClinicalCase({
      schoolId: data.schoolId,
      currentSupervisorId: supervisorId,
      studentId: student.id,
    });

    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false, error: "Something went wrong" };
  }
}

export async function editWeeklyFellowRating(
  data: Omit<
    WeeklyFellowRatings,
    "createdAt" | "updatedAt" | "fellowId" | "supervisorId" | "week"
  >,
) {
  try {
    const result = await db.weeklyFellowRatings.update({
      where: {
        id: data.id,
      },
      data: {
        behaviourNotes: data.behaviourNotes,
        punctualityNotes: data.punctualityNotes,
        dressingAndGroomingNotes: data.dressingAndGroomingNotes,
        programDeliveryNotes: data.programDeliveryNotes,
        behaviourRating: data.behaviourRating,
        dressingAndGroomingRating: data.dressingAndGroomingRating,
        programDeliveryRating: data.programDeliveryRating,
        punctualityRating: data.punctualityRating,
      },
    });
    revalidatePath("/profile");
    return { success: true, data: result };
  } catch (e) {
    console.error(e);
    return {
      error: "Something went wrong during submission, please try again.",
    };
  }
}

export async function editClinicalCaseSessionAttendanceDate(data: {
  dateOfSession: Date;
  sessionId: string;
}) {
  try {
    await db.clinicalSessionAttendance.update({
      where: {
        id: data.sessionId,
      },
      data: {
        date: data.dateOfSession,
      },
    });

    revalidatePath(`/screenings`);
    return { success: true };
  } catch (error) {
    console.error(error);
    return { error: "Something went wrong" };
  }
}

export async function deleteClinicalCaseSessionAttendanceDate(data: {
  sessionId: string;
}) {
  try {
    await db.clinicalSessionAttendance.delete({
      where: {
        id: data.sessionId,
      },
    });

    revalidatePath(`/screenings`);
    return { success: true };
  } catch (error) {
    console.error(error);
    return { error: "Something went wrong" };
  }
}

export async function undropoutStudent(studentId: string, path: string) {
  try {
    await db.student.update({
      where: {
        id: studentId,
      },
      data: {
        droppedOut: false,
        dropOutReason: null,
        droppedOutAt: null,
      },
    });
    revalidatePath(path);
    return { success: true };
  } catch (error) {
    console.error(error);
    return { error: "Something went wrong", success: false };
  }
}

export async function editStudentInfoFromClinicalCaseScreen(
  {
    studentId,
    screeningId,
  }: {
    studentId: string;
    screeningId: string;
  },
  data: {
    studentName: string;
    admissionNumber: string;
    age: string;
    county: string;
    form: string;
    contactNumber?: string;
    stream: string;
    gender: string;
    studentGroup?: string;
  },
) {
  try {
    await db.student.update({
      where: {
        id: studentId,
      },
      data: {
        studentName: data.studentName,
        admissionNumber: data.admissionNumber,
        age: parseInt(data.age),
        gender: data.gender,
        form: parseInt(data.form),
        stream: data.stream,
        county: data.county,
        phoneNumber: data.contactNumber,
        groupName: data.studentGroup,
      },
    });

    revalidatePath(`/screenings/${screeningId}`);
    return { success: true };
  } catch (error) {
    console.error(error);
    return { error: "Something went wrong" };
  }
}
