"use server";

import type {
  caseStatusOptions,
  Fellow,
  ImplementerRole,
  riskStatusOptions,
  WeeklyFellowRatings,
} from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getCurrentUser } from "#/app/auth";
import { InviteUserCommand } from "#/commands/invite-user";
import { CURRENT_PROJECT_ID } from "#/lib/constants";
import { objectId } from "#/lib/crypto";
import { db } from "#/lib/db";
import { getHighestValue } from "#/lib/utils";
import { EditFellowSchema } from "#/lib/validators";
import type { AttendanceStatus, SessionLabel, SessionNumber } from "#/types/app";

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
        sessionId: interventionSession.id,
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
      const user = await getCurrentUser();
      if (user !== null) {
        attendance = await db.studentAttendance.create({
          data: {
            projectId: CURRENT_PROJECT_ID,
            studentId: student.id,
            schoolId: school.id,
            sessionId: interventionSession.id,
            attended: attendanceBoolean,
            markedBy: user.user.id,
            groupId: groupId,
            fellowId,
          },
        });
      }
    }

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
  const interventionSession = await db.interventionSession.findFirst({
    where: {
      schoolId: data.schoolId,
      sessionType: data.sessionType,
    },
  });

  if (!interventionSession) {
    return { success: false, error: "Intervention session not found" };
  }

  const occurred = data.occurred;
  let success = false;

  if (interventionSession.occurred === true) {
    await db.interventionSession.update({
      where: {
        id: interventionSession.id,
      },
      data: { occurred },
    });
    success = true;
  } else if (interventionSession.occurred === false) {
    await db.interventionSession.update({
      where: {
        id: interventionSession.id,
      },
      data: { occurred },
    });
    success = true;
  }

  return { success };
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
        amount: Number.parseInt(data.amount),
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
): Promise<{ success: boolean; result?: any; error?: string }> {
  try {
    const interventionSession = await db.interventionSession.findFirst({
      where: {
        schoolId: data.schoolId,
        sessionType: data.sessionType,
      },
    });

    if (!interventionSession) {
      return { success: false, error: "Intervention session not found" };
    }

    const result = await db.interventionSession.update({
      where: {
        id: interventionSession.id,
      },
      data: {
        sessionDate: data.sessionDate,
      },
    });

    return { success: true, result };
  } catch (error: unknown) {
    console.error("Failed to update intervention session date:", error);
    return {
      success: false,
      error: "Failed to update intervention session date",
    };
  }
}

export async function dropoutSchoolWithReason(schoolVisibleId: string, dropoutReason: string) {
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
  const { activeMembership } = user.session.user;
  if (!activeMembership) {
    return null;
  }
  await db.implementerMember.update({
    where: { id: activeMembership.id },
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
    revalidatePath(`/profile/myschool?sid=${school?.visibleId}`);
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
    throw new Error("Invalid fields supplied, please review submission details");
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

export async function updateClinicalCaseStatus(caseId: string, status: caseStatusOptions) {
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
        const initialCaseHistoryId = currentcase?.caseTransferTrail[0]?.id ?? null;

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

    const emergencyPresentingIssues = result_data?.emergencyPresentingIssues ?? {};

    const combinedPresentingIssues = {
      // ...(emergencyPresentingIssues as { [k: string]: string }),
      ...(emergencyPresentingIssues as Record<string, any>),
      ...data.presentingIssues,
    };

    const highestValue: riskStatusOptions = getHighestValue(combinedPresentingIssues);

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
  role: "CLINICAL_LEAD" | "SUPERVISOR";
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

    revalidatePath(`${data.role === "CLINICAL_LEAD" ? "/cl/clinical" : "/sc/clinical"}`);
    return { success: true };
  } catch (error) {
    return { error: "Something went wrong" };
  }
}

export async function storeSupervisorProgressNotes(caseId: string, documentURL: string) {
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
  sessionId?: string;
}) {
  try {
    if (!payload.id) {
      await db.interventionGroupReport.create({
        data: {
          id: objectId("ige"),
          groupId: payload.groupId,
          [payload.key]: payload.rating,
          sessionId: payload.sessionId,
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
        age: Number.parseInt(data.age),
        gender: data.gender,
        form: Number.parseInt(data.form),
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

// DEPRECATED
export async function editWeeklyFellowRating(
  data: Omit<WeeklyFellowRatings, "createdAt" | "updatedAt" | "fellowId" | "supervisorId" | "week">,
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

    revalidatePath("/screenings");
    return { success: true };
  } catch (error) {
    console.error(error);
    return { error: "Something went wrong" };
  }
}

export async function deleteClinicalCaseSessionAttendanceDate(data: { sessionId: string }) {
  try {
    await db.clinicalSessionAttendance.delete({
      where: {
        id: data.sessionId,
      },
    });

    revalidatePath("/screenings");
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
        age: Number.parseInt(data.age),
        gender: data.gender,
        form: Number.parseInt(data.form),
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
