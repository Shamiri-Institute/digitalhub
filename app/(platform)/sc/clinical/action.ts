"use server";

import { currentSupervisor } from "#/app/auth";

import { db } from "#/lib/db";
import { revalidatePath } from "next/cache";

export async function getClinicalCases() {
  const supervisor = await currentSupervisor();
  return [
    {
      id: "special-case-id",
      school: "Olympic Secondary School",
      pseudonym: "Ben Tendo",
      dateAdded: "2024-01-01",
      caseStatus: "Active",
      risk: "High",
      age: "20 yrs",
      referralFrom: "Fellow",
      hubId: supervisor?.hubId,
      emergencyPresentingIssues: [
        {
          emergencyPresentingIssues: "Bullying",
          lowRisk: true,
          moderateRisk: false,
          highRisk: false,
          severeRisk: false,
        },
        {
          emergencyPresentingIssues: "Substance abuse",
          lowRisk: false,
          moderateRisk: true,
          highRisk: false,
          severeRisk: false,
        },
        {
          emergencyPresentingIssues: "Sexual abuse",
          lowRisk: false,
          moderateRisk: false,
          highRisk: true,
          severeRisk: false,
        },
        {
          emergencyPresentingIssues: "Suicidality",
          lowRisk: false,
          moderateRisk: false,
          highRisk: false,
          severeRisk: true,
        },
        {
          emergencyPresentingIssues: "Self-harm",
          lowRisk: true,
          moderateRisk: false,
          highRisk: false,
          severeRisk: false,
        },
        {
          emergencyPresentingIssues: "Child abuse",
          lowRisk: false,
          moderateRisk: false,
          highRisk: true,
          severeRisk: false,
        },
      ],
      generalPresentingIssues: [
        {
          generalPresentingIssues: "Academic issues",
          lowRisk: false,
          moderateRisk: true,
          highRisk: false,
          severeRisk: false,
        },
        {
          generalPresentingIssues: "Family issues",
          lowRisk: true,
          moderateRisk: false,
          highRisk: false,
          severeRisk: false,
        },
        {
          generalPresentingIssues: "Peer pressure",
          lowRisk: false,
          moderateRisk: false,
          highRisk: true,
          severeRisk: false,
        },
        {
          generalPresentingIssues: "Romantic relationship issues",
          lowRisk: true,
          moderateRisk: false,
          highRisk: false,
          severeRisk: false,
        },
        {
          generalPresentingIssues: "Self esteem issues",
          lowRisk: false,
          moderateRisk: false,
          highRisk: false,
          severeRisk: true,
        },
      ],

      sessionAttendanceHistory: [
        {
          sessionId: "1",
          session: "Clinical S1",
          sessionDate: "2024-01-01",
          attendanceStatus: true,
        },
        {
          sessionId: "2",
          session: "Clinical S2",
          sessionDate: "2024-01-02",
          attendanceStatus: false,
        },
        {
          sessionId: "3",
          session: "Clinical S3",
          sessionDate: "2024-01-03",
          attendanceStatus: null,
        },
        {
          sessionId: "4",
          session: "Clinical S4",
          sessionDate: "2024-01-04",
          attendanceStatus: true,
        },
      ],
    },
  ];
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
        // @ts-ignore - its in a pr that is not yet merged
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

export async function updateTreatmentPlan(data: {
  caseId: string;
  currentOrsScore: number;
  plannedSessions: number;
  sessionFrequency: string;
  treatmentInterventions: string[];
  otherIntervention?: string;
  interventionExplanation: string;
}) {
  try {
    await db.clinicalFollowUpTreatmentPlan.update({
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
    revalidatePath("/sc/clinical");
    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false };
  }
}
