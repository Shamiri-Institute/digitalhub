"use server";

import { currentSupervisor, getCurrentUser } from "#/app/auth";

import { db } from "#/lib/db";
import { revalidatePath } from "next/cache";

export async function getClinicalCases() {
  const supervisor = await currentSupervisor();

  const cases = await db.clinicalScreeningInfo.findMany({
    where: {
      currentSupervisorId: supervisor?.id,
    },
    include: {
      student: {
        include: {
          school: {
            select: {
              schoolName: true,
            },
          },
        },
      },
      sessions: {
        select: {
          id: true,
          session: true,
          date: true,
          attendanceStatus: true,
        },
        orderBy: {
          date: "asc",
        },
      },
    },
  });

  return cases.map((caseInfo) => {
    const age = caseInfo.student?.age ? `${caseInfo.student.age} yrs` : "N/A";

    // Parse emergency presenting issues from JSON
    const emergencyIssues = caseInfo.emergencyPresentingIssues as Record<
      string,
      {
        lowRisk: boolean;
        moderateRisk: boolean;
        highRisk: boolean;
        severeRisk: boolean;
      }
    > | null;

    const formattedEmergencyIssues = emergencyIssues
      ? Object.entries(emergencyIssues).map(([issue, risks]) => ({
          emergencyPresentingIssues: issue,
          ...risks,
        }))
      : [];

    const formattedSessions = caseInfo.sessions.map((session) => ({
      sessionId: session.id,
      session: session.session,
      sessionDate: session.date.toLocaleDateString(),
      attendanceStatus: session.attendanceStatus,
    }));

    return {
      id: caseInfo.id,
      school: caseInfo.student?.school?.schoolName,
      pseudonym: caseInfo.pseudonym || "Anonymous",
      dateAdded: caseInfo.createdAt.toLocaleDateString(),
      caseStatus: caseInfo.caseStatus,
      risk: caseInfo.riskStatus,
      age,
      referralFrom:
        caseInfo.referredFrom ||
        caseInfo.initialReferredFromSpecified ||
        "Unknown",
      hubId: supervisor?.hubId,
      emergencyPresentingIssues: formattedEmergencyIssues,
      flagged: caseInfo.flagged,
      flaggedReason: caseInfo.flaggedReason,
      sessionAttendanceHistory: formattedSessions,
      generalPresentingIssues: [],
    };
  });
}

export async function getClinicalCasesStats() {
  const supervisor = await currentSupervisor();

  const caseStats = await db.clinicalScreeningInfo.groupBy({
    by: ["caseStatus"],
    where: {
      currentSupervisorId: supervisor?.id,
    },
    _count: {
      id: true,
    },
  });

  const stats = caseStats.reduce(
    (acc, stat) => ({
      ...acc,
      [stat.caseStatus === "Terminated"
        ? "completedCases"
        : stat.caseStatus === "FollowUp"
          ? "followUpCases"
          : stat.caseStatus === "Active"
            ? "activeCases"
            : "other"]: stat._count.id,
    }),
    {
      totalCases: 0,
      completedCases: 0,
      followUpCases: 0,
      activeCases: 0,
    },
  );

  stats.totalCases =
    stats.completedCases + stats.followUpCases + stats.activeCases;

  const activeCasesPercentage = (stats.activeCases / stats.totalCases) * 100;
  const followUpCasesPercentage =
    (stats.followUpCases / stats.totalCases) * 100;
  const completedCasesPercentage =
    (stats.completedCases / stats.totalCases) * 100;

  return {
    ...stats,
    activeCasesPercentage,
    followUpCasesPercentage,
    completedCasesPercentage,
  };
}

export type ClinicalCases = Awaited<
  ReturnType<typeof getClinicalCases>
>[number];

export async function supSubmitConsultClinicalexpert(data: {
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
    revalidatePath("/sc/clinical");
    return { success: true };
  } catch (error) {
    console.error(error);
    return { error: "Something went wrong" };
  }
}

export async function updateClinicalSessionAttendance(
  sessionId: string,
  attendanceStatus: boolean | null,
) {
  try {
    await db.clinicalSessionAttendance.update({
      where: {
        id: sessionId,
      },
      data: {
        attendanceStatus: attendanceStatus,
      },
    });

    return {
      success: true,
      message: "Attendance updated successfully",
    };
  } catch (error) {
    console.error(error);
    return {
      success: false,
      message: "Failed to update attendance",
    };
  }
}

export async function referClinicalCaseAsSupervisor(data: {
  referTo: string;
  referralReason: string;
  caseId: string;
  referredFrom: string;
  referredFromSpecified: string;
  referredTo: string;
  referredToPerson: string | null;
  externalCare: string | null;
  referralNotes: string;
  supervisorName: string;
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
        referralReason: data.referralReason,
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
    return { success: false };
  }
}

export async function getSupervisorsInHub() {
  try {
    const supervisor = await currentSupervisor();
    const supervisors = await db.supervisor.findMany({
      where: {
        hubId: supervisor?.hubId,
        id: {
          not: supervisor?.id,
        },
      },
    });
    const allSupervisors =
      supervisors.map((supervisor) => ({
        id: supervisor.id,
        name: supervisor.supervisorName,
      })) || [];
    return {
      currentSupervisor: {
        id: supervisor?.id,
        name: supervisor?.supervisorName,
      },
      allSupervisors: allSupervisors,
    };
  } catch (error) {
    console.error(error);
    return {
      currentSupervisor: null,
      allSupervisors: [],
    };
  }
}

export async function getSchoolsInHub() {
  const supervisor = await currentSupervisor();

  const [schools, supervisorsInHub, fellowsInHub] = await Promise.all([
    db.school.findMany({
      where: {
        hubId: supervisor?.hubId,
      },
      include: {
        students: true,
        interventionSessions: {
          select: {
            id: true,
            session: {
              select: {
                sessionName: true,
                sessionLabel: true,
              },
            },
          },
        },
      },
    }),
    db.supervisor.findMany({
      where: {
        hubId: supervisor?.hubId,
      },
    }),
    db.fellow.findMany({
      where: {
        hubId: supervisor?.hubId,
      },
    }),
  ]);

  return {
    schools,
    supervisorsInHub,
    fellowsInHub,
    currentSupervisorId: supervisor?.id,
  };
}

export async function createClinicalCaseBySupervisor(data: {
  studentId: string;
  schoolId: string;
  currentSupervisorId: string;
  pseudonym: string;
  stream: string;
  classForm: string;
  age: number;
  gender: string;
  initialContact: string;
  supervisorId?: string;
  fellowId?: string;
  sessionId: string;
}) {
  try {
    await db.$transaction(async (tx) => {
      await tx.clinicalScreeningInfo.create({
        data: {
          studentId: data.studentId,
          schoolId: data.schoolId,
          currentSupervisorId: data.currentSupervisorId,
          pseudonym: data.pseudonym,
          initialReferredFromSpecified: data.initialContact,
          initialReferredFrom: data.fellowId ?? data.supervisorId,
          flagged: false,
          riskStatus: "No",
          caseStatus: "Active",
          sessionWhenCaseIsFlaggedId: data.sessionId,
        },
      });

      await tx.student.update({
        where: {
          id: data.studentId,
        },
        data: {
          form: parseInt(data.classForm),
          stream: data.stream,
          age: data.age,
          gender: data.gender,
        },
      });
    });

    revalidatePath("/sc/clinical");
    return { success: true, message: "Clinical case created successfully" };
  } catch (error) {
    console.error(error);
    return { success: false, message: "Something went wrong" };
  }
}

type TreatmentPlanData = {
  caseId: string;
  currentOrsScore: number;
  plannedSessions: number;
  sessionFrequency: string;
  treatmentInterventions: string[];
  otherIntervention?: string;
  interventionExplanation: string;
};

export async function updateTreatmentPlan(
  data: TreatmentPlanData & { beforeData: TreatmentPlanData },
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      throw new Error("User not found");
    }

    await db.$transaction(async (tx) => {
      const treatmentPlan = await tx.clinicalFollowUpTreatmentPlan.update({
        where: {
          id: data.caseId,
        },
        data: {
          currentORSScore: data.currentOrsScore,
          plannedSessions: data.plannedSessions,
          sessionFrequency: data.sessionFrequency,
          plannedTreatmentIntervention: data.treatmentInterventions,
          otherTreatmentIntervention: data.otherIntervention,
          plannedTreatmentInterventionExplanation: data.interventionExplanation,
          caseId: data.caseId,
        },
      });

      await tx.clinicalFollowUpTreatmentPlanAuditTrail.create({
        data: {
          caseId: data.caseId,
          action: "Update",
          userId: currentUser.user.id,
          afterData: treatmentPlan,
          beforeData: data.beforeData,
        },
      });
    });

    revalidatePath("/sc/clinical");
    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false };
  }
}

export async function createTreatmentPlan(data: TreatmentPlanData) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      throw new Error("User not found");
    }

    await db.$transaction(async (tx) => {
      const treatmentPlan = await tx.clinicalFollowUpTreatmentPlan.create({
        data: {
          caseId: data.caseId,
          currentORSScore: data.currentOrsScore,
          plannedSessions: data.plannedSessions,
          sessionFrequency: data.sessionFrequency,
          plannedTreatmentIntervention: data.treatmentInterventions,
          plannedTreatmentInterventionExplanation: data.interventionExplanation,
          otherTreatmentIntervention: data.otherIntervention,
        },
      });

      await tx.clinicalFollowUpTreatmentPlanAuditTrail.create({
        data: {
          caseId: data.caseId,
          action: "Create",
          userId: currentUser.user.id,
          afterData: treatmentPlan,
        },
      });
    });

    revalidatePath("/sc/clinical");
    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false };
  }
}
