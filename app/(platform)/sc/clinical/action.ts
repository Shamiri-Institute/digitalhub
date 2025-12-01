"use server";

import { ImplementerRole } from "@prisma/client";
import { revalidatePath } from "next/cache";
import type { EditStudentInfoFormValues } from "#/app/(platform)/sc/clinical/components/view-edit-student-info";
import { currentSupervisor, getCurrentPersonnel } from "#/app/auth";
import { CURRENT_PROJECT_ID } from "#/lib/constants";
import { db } from "#/lib/db";

export type ClinicalCases = Awaited<ReturnType<typeof getClinicalCases>>[number];

export async function getClinicalCases() {
  const supervisor = await currentSupervisor();

  const cases = await db.clinicalScreeningInfo.findMany({
    where: {
      currentSupervisorId: supervisor?.profile?.id,
    },
    include: {
      student: {
        include: {
          school: {
            select: {
              schoolName: true,
            },
          },
          assignedGroup: {
            select: {
              groupName: true,
            },
          },
        },
      },
      sessions: true,
      clinicalCaseNotes: true,
      followUptreatmentPlan: true,
    },
  });

  return cases.map((caseInfo) => {
    const age = caseInfo.student?.age ? `${caseInfo.student.age} yrs` : "N/A";

    const formattedSessions = caseInfo.sessions.map((session) => ({
      sessionId: session.id,
      session: session.session,
      sessionDate: session.date.toLocaleDateString(),
      attendanceStatus: session.attendanceStatus,
    }));

    const latestCaseNote = caseInfo.clinicalCaseNotes.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )[0];
    const riskLevel = latestCaseNote?.riskLevel || "N/A";

    return {
      id: caseInfo.id,
      school: caseInfo.student?.school?.schoolName,
      pseudonym: caseInfo.pseudonym || "Anonymous",
      dateAdded: caseInfo.createdAt.toLocaleDateString(),
      caseStatus: caseInfo.caseStatus,
      risk: riskLevel,
      age,
      referralFrom: caseInfo.referredFrom || caseInfo.initialReferredFromSpecified || "Unknown",
      hubId: supervisor?.profile?.hubId,
      flagged: caseInfo.flagged,
      flaggedReason: caseInfo.flaggedReason,
      sessionAttendanceHistory: formattedSessions,
      student: caseInfo.student,
      emergencyPresentingIssuesBaseline: caseInfo.emergencyPresentingIssuesBaseline,
      generalPresentingIssuesBaseline: caseInfo.generalPresentingIssuesBaseline,
      emergencyPresentingIssuesEndpoint: caseInfo.emergencyPresentingIssuesEndpoint,
      generalPresentingIssuesEndpoint: caseInfo.generalPresentingIssuesEndpoint,
      generalPresentingIssuesOtherSpecifiedBaseline:
        caseInfo.generalPresentingIssuesOtherSpecifiedBaseline,
      generalPresentingIssuesOtherSpecifiedEndpoint:
        caseInfo.generalPresentingIssuesOtherSpecifiedEndpoint,
      clinicalSessionAttendance: caseInfo.sessions,
      currentSupervisorId: caseInfo.currentSupervisorId,
      clinicalCaseNotes: caseInfo.clinicalCaseNotes,
      clinicalLeadId: caseInfo.clinicalLeadId,
      role: "SUPERVISOR",
      treatmentPlanUploaded: !!caseInfo.followUptreatmentPlan,
    };
  });
}

export async function getClinicalCasesStats() {
  const supervisor = await currentSupervisor();

  const caseStats = await db.clinicalScreeningInfo.groupBy({
    by: ["caseStatus"],
    where: {
      currentSupervisorId: supervisor?.profile?.id,
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

  stats.totalCases = stats.completedCases + stats.followUpCases + stats.activeCases;

  const activeCasesPercentage = (stats.activeCases / stats.totalCases) * 100;
  const followUpCasesPercentage = (stats.followUpCases / stats.totalCases) * 100;
  const completedCasesPercentage = (stats.completedCases / stats.totalCases) * 100;

  return {
    ...stats,
    activeCasesPercentage,
    followUpCasesPercentage,
    completedCasesPercentage,
  };
}

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
  const user = await getCurrentPersonnel();
  if (!user) {
    throw new Error("User not found");
  }

  const role = user.session.user.activeMembership?.role;
  if (!role || (role !== ImplementerRole.CLINICAL_LEAD && role !== ImplementerRole.SUPERVISOR)) {
    throw new Error("You are not authorized to update clinical session attendance");
  }

  try {
    await db.clinicalSessionAttendance.update({
      where: {
        id: sessionId,
      },
      data: {
        attendanceStatus: attendanceStatus,
      },
    });

    if (role === ImplementerRole.CLINICAL_LEAD) {
      revalidatePath("/cl/clinical");
    } else {
      revalidatePath("/sc/clinical");
    }

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

export async function referClinicalCaseToSupervisor(data: {
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
            from: data.referredFrom,
            fromRole: data.referredFromSpecified,
            to: data.supervisorName,
            toRole: data.referredToPerson ?? data.referredTo,
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
        hubId: supervisor?.profile?.hubId,
        id: {
          not: supervisor?.profile?.id,
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
        id: supervisor?.profile?.id,
        name: supervisor?.profile?.supervisorName,
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

  const [schools, supervisorsInHub, fellowsInProject, hubs] = await Promise.all([
    db.school.findMany({
      where: {
        hubId: supervisor?.profile?.hubId,
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
        hubId: supervisor?.profile?.hubId,
      },
    }),
    db.fellow.findMany({
      where: {
        hub: {
          projectId: CURRENT_PROJECT_ID,
        },
      },
      include: {
        hub: {
          select: {
            id: true,
          },
        },
      },
    }),
    db.hub.findMany({
      where: {
        projectId: CURRENT_PROJECT_ID,
      },
      select: {
        id: true,
        hubName: true,
      },
    }),
  ]);

  return {
    schools,
    supervisorsInHub,
    fellowsInProject,
    currentSupervisorId: supervisor?.profile?.id,
    hubs,
  };
}

export async function createStudentClinicalCase(data: {
  studentId: string;
  schoolId: string;
  creatorId: string;
  pseudonym: string;
  stream: string;
  classForm: string;
  age: number;
  gender: string;
  initialContact: string;
  supervisorId?: string;
  fellowId?: string;
  sessionId: string;
  role: "CLINICAL_LEAD" | "SUPERVISOR";
}) {
  try {
    await db.$transaction(async (tx) => {
      await tx.clinicalScreeningInfo.create({
        data: {
          studentId: data.studentId,
          schoolId: data.schoolId,
          currentSupervisorId: data.role === "SUPERVISOR" ? data.creatorId : null,
          pseudonym: data.pseudonym,
          initialReferredFromSpecified: data.initialContact,
          initialReferredFrom: data.fellowId ?? data.supervisorId,
          flagged: false,
          riskStatus: "No",
          caseStatus: "Active",
          sessionWhenCaseIsFlaggedId: data.sessionId,
          clinicalLeadId: data.role === "CLINICAL_LEAD" ? data.creatorId : null,
        },
      });

      await tx.student.update({
        where: {
          id: data.studentId,
        },
        data: {
          form: Number.parseInt(data.classForm),
          stream: data.stream,
          age: data.age,
          gender: data.gender,
        },
      });
    });

    revalidatePath(`${data.role === "CLINICAL_LEAD" ? "/cl/clinical" : "/sc/clinical"}`);
    return { success: true, message: "Clinical case created successfully" };
  } catch (error) {
    console.error(error);
    return {
      success: false,
      message: "Something went wrong, please try again",
    };
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
    const user = await getCurrentPersonnel();
    const userId = user?.session?.user.id;
    if (!user || !userId) {
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
          userId: userId,
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

export async function createTreatmentPlan(
  data: TreatmentPlanData & { role: "CLINICAL_LEAD" | "SUPERVISOR" },
) {
  try {
    const user = await getCurrentPersonnel();
    const userId = user?.session?.user.id;
    if (!user || !userId) {
      throw new Error("User not found");
    }
    const role = user.session.user.activeMembership?.role;
    if (!role || (role !== ImplementerRole.CLINICAL_LEAD && role !== ImplementerRole.SUPERVISOR)) {
      throw new Error("You are not authorized to create a treatment plan");
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
          userId: userId,
          afterData: treatmentPlan,
        },
      });
    });

    revalidatePath(`${role === ImplementerRole.CLINICAL_LEAD ? "/cl/clinical" : "/sc/clinical"}`);
    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false };
  }
}

export async function updateStudentInfo(data: EditStudentInfoFormValues) {
  try {
    await db.$transaction(async (tx) => {
      await tx.student.update({
        where: {
          id: data.studentId,
        },
        data: {
          studentName: data.studentName,
          gender: data.gender,
          admissionNumber: data.admissionNumber,
          form: Number.parseInt(data.classForm),
          stream: data.stream,
        },
      });

      await tx.clinicalScreeningInfo.update({
        where: {
          id: data.caseId,
        },
        data: {
          pseudonym: data.pseudonym,
        },
      });
    });

    return {
      success: true,
      message: "Student information updated successfully",
    };
  } catch (error) {
    console.error(error);
    return {
      success: false,
      message: "Failed to update student information",
    };
  }
}

export async function updateClinicalCaseGeneralPresentingIssue(data: {
  caseId: string;
  generalPresentingIssues: { [k: string]: string };
  otherIssues: string;
  caseStatus: string;
}) {
  try {
    const updateData =
      data.caseStatus === "Active"
        ? {
            generalPresentingIssuesBaseline: data.generalPresentingIssues,
            generalPresentingIssuesOtherSpecifiedBaseline: data.otherIssues,
          }
        : {
            generalPresentingIssuesEndpoint: data.generalPresentingIssues,
            generalPresentingIssuesOtherSpecifiedEndpoint: data.otherIssues,
          };

    await db.clinicalScreeningInfo.update({
      where: {
        id: data.caseId,
      },
      data: updateData,
    });

    revalidatePath("/sc/clinical");
    return { success: true };
  } catch (error) {
    console.error(error);
    return { error: "Something went wrong" };
  }
}

export async function updateClinicalCaseEmergencyPresentingIssue(data: {
  caseId: string;
  presentingIssues: { [k: string]: string };
  caseStatus: string;
}) {
  try {
    const updateData =
      data.caseStatus === "Active"
        ? {
            emergencyPresentingIssuesBaseline: data.presentingIssues,
          }
        : {
            emergencyPresentingIssuesEndpoint: data.presentingIssues,
          };

    await db.clinicalScreeningInfo.update({
      where: {
        id: data.caseId,
      },
      data: updateData,
    });

    revalidatePath("/sc/clinical");
    return { success: true };
  } catch (error) {
    console.error(error);
    return { error: "Something went wrong" };
  }
}

export async function terminateClinicalCase(data: {
  caseId: string;
  terminationReason: string;
  terminationReasonExplanation: string;
  sessionId: string;
}) {
  try {
    const user = await getCurrentPersonnel();
    const userId = user?.session?.user.id;
    if (!user || !userId) {
      throw new Error("User not found");
    }
    const role = user.session.user.activeMembership?.role;
    if (!role || (role !== ImplementerRole.CLINICAL_LEAD && role !== ImplementerRole.SUPERVISOR)) {
      throw new Error("You are not authorized to terminate this case");
    }

    await db.$transaction(async (tx) => {
      await tx.clinicalScreeningInfo.update({
        where: {
          id: data.caseId,
        },
        data: {
          caseStatus: "Terminated",
        },
      });

      await tx.clinicalCaseTermination.create({
        data: {
          caseId: data.caseId,
          terminationDate: new Date(),
          terminationReason: data.terminationReason,
          terminationReasonExplanation: data.terminationReasonExplanation,
          sessionId: data.sessionId,
          createdBy: userId,
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

export async function createClinicalCaseNotes(data: {
  caseId: string;
  sessionId: string;
  presentingIssues: string;
  orsAssessment: number;
  riskLevel: string;
  necessaryConditions: string;
  treatmentInterventions: string[];
  otherIntervention: string;
  interventionExplanation: string;
  studentResponseExplanation: string;
  followUpPlan: "GROUP" | "INDIVIDUAL";
  followUpPlanExplanation: string;
  role: "CLINICAL_LEAD" | "SUPERVISOR";
}) {
  try {
    const user = await getCurrentPersonnel();
    const userId = user?.session?.user.id;
    if (!user || !userId) {
      throw new Error("User not found");
    }

    const role = user.session.user.activeMembership?.role;
    if (!role || (role !== ImplementerRole.CLINICAL_LEAD && role !== ImplementerRole.SUPERVISOR)) {
      throw new Error("You are not authorized to create clinical case notes");
    }

    await db.clinicalCaseNotes.create({
      data: {
        caseId: data.caseId,
        sessionId: data.sessionId,
        createdBy: userId,
        presentingIssues: data.presentingIssues,
        orsAssessment: data.orsAssessment,
        riskLevel: data.riskLevel,
        necessaryConditions: data.necessaryConditions,
        treatmentInterventions: data.treatmentInterventions,
        otherIntervention: data.otherIntervention,
        interventionExplanation: data.interventionExplanation,
        studentResponseExplanations: data.studentResponseExplanation,
        followUpPlan: data.followUpPlan,
        followUpPlanExplanation: data.followUpPlanExplanation,
      },
    });

    revalidatePath(`${role === ImplementerRole.CLINICAL_LEAD ? "/cl/clinical" : "/sc/clinical"}`);
    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false };
  }
}

export async function updateClinicalCaseAttendance(data: {
  caseId: string;
  session: string;
  supervisorId: string | null;
  dateOfSession: Date;
  attendanceStatus: boolean;
  role: "CLINICAL_LEAD" | "SUPERVISOR";
  clinicalLeadId: string | null;
}) {
  try {
    const user = await getCurrentPersonnel();
    const userId = user?.session?.user.id;
    if (!user || !userId) {
      throw new Error("User not found");
    }

    const role = user.session.user.activeMembership?.role;
    if (!role || (role !== ImplementerRole.CLINICAL_LEAD && role !== ImplementerRole.SUPERVISOR)) {
      throw new Error("You are not authorized to create clinical case notes");
    }

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
            clinicalLeadId: data.clinicalLeadId,
            attendanceStatus: data.attendanceStatus,
          },
        },
      },
    });

    revalidatePath(`${role === ImplementerRole.CLINICAL_LEAD ? "/cl/clinical" : "/sc/clinical"}`);
    return { success: true };
  } catch (error) {
    console.error(error);
    return { error: "Something went wrong" };
  }
}

export async function getClinicalLeads() {
  try {
    const supervisor = await currentSupervisor();
    if (!supervisor) {
      throw new Error("Supervisor not found");
    }
    const clinicalLeads = await db.clinicalLead.findMany();
    const clinicalLeadsWithSupervisor = clinicalLeads.map((lead) => ({
      name: lead.clinicalLeadName,
      id: lead.id,
      hubId: lead.assignedHubId,
    }));
    return clinicalLeadsWithSupervisor || [];
  } catch (error) {
    console.error(error);
    return [];
  }
}

export async function referClinicalCaseToClinicalLead(data: {
  referralReason: string;
  caseId: string;
  referredFrom: string;
  referredFromSpecified: string;
  referredTo: string;
  referredToPerson: string;
  referralNotes: string;
  referredToPersonId: string;
}) {
  try {
    await db.clinicalScreeningInfo.update({
      where: {
        id: data.caseId,
      },
      data: {
        clinicalLeadId: data.referredToPersonId,
        referralNotes: data.referralNotes,
        referralStatus: "Pending",
        referralReason: data.referralReason,
        referredTo: data.referredTo,
        caseTransferTrail: {
          create: {
            from: data.referredFrom,
            fromRole: data.referredFromSpecified,
            to: data.referredToPerson,
            toRole: data.referredToPersonId,
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

export async function getReferredCasesToSupervisor() {
  const supervisor = await currentSupervisor();
  if (!supervisor) {
    throw new Error("Supervisor not found");
  }

  const referredCases = await db.clinicalScreeningInfo.findMany({
    where: {
      referredToSupervisorId: supervisor?.profile.id,
      acceptCase: false,
    },
    include: {
      student: true,
    },
  });

  return referredCases;
}

export async function triggerCaseStatusToFollowup(data: { caseId: string }) {
  try {
    await db.clinicalScreeningInfo.update({
      where: {
        id: data.caseId,
      },
      data: {
        caseStatus: "FollowUp",
      },
    });

    revalidatePath("/sc/clinical");
    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false };
  }
}
