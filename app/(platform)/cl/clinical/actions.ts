"use server";

import { currentClinicalLead } from "#/app/auth";
import {
  type CaseNotesResult,
  fetchClinicalCasesChartData,
  fetchClinicalCasesList,
  type HubClinicalCases,
} from "#/lib/actions/clinical/cases";
import { db } from "#/lib/db";

export type { CaseNotesResult, HubClinicalCases };

export async function getClinicalCasesData() {
  const clinicalLead = await currentClinicalLead();
  if (!clinicalLead) throw new Error("Unauthorized");

  return await fetchClinicalCasesChartData({
    hubId: clinicalLead.profile.assignedHubId,
    clinicalLeadId: clinicalLead.profile.id,
  });
}

export async function getClinicalCasesInHub(): Promise<HubClinicalCases[]> {
  try {
    const clinicalLead = await currentClinicalLead();
    if (!clinicalLead) throw new Error("Unauthorized");

    return await fetchClinicalCasesList(
      { hubId: clinicalLead.profile.assignedHubId, clinicalLeadId: clinicalLead.profile.id },
      clinicalLead.profile.id,
    );
  } catch (error) {
    console.error("Error fetching clinical cases:", error);
    return [];
  }
}

export async function getSchoolsInClinicalLeadHub() {
  const clinicalLead = await currentClinicalLead();
  const projectId = clinicalLead?.profile.assignedHub?.projectId;
  if (!projectId) {
    throw new Error("Hub has no project");
  }

  const [schools, supervisorsInHub, fellowsInProject, hubs] = await Promise.all([
    db.school.findMany({
      where: {
        hubId: clinicalLead?.profile.assignedHubId,
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
        hubId: clinicalLead?.profile.assignedHubId,
      },
    }),
    db.fellow.findMany({
      where: {
        hub: {
          projectId,
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
        projectId,
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
    currentClinicalLeadId: clinicalLead?.profile.id,
    hubs,
  };
}

export type ClinicalLeadCasesType = Awaited<
  ReturnType<typeof getClinicalCasesCreatedByClinicalLead>
>[number];

export async function getClinicalCasesCreatedByClinicalLead() {
  const clinicalLead = await currentClinicalLead();

  const cases = await db.clinicalScreeningInfo.findMany({
    where: {
      clinicalLeadId: clinicalLead?.profile.id,
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
      hubId: clinicalLead?.profile.assignedHubId,
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
      role: "CLINICAL_LEAD",
      treatmentPlanUploaded: !!caseInfo.followUptreatmentPlan,
    };
  });
}
