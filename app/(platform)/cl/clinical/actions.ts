"use server";

import { eq } from "drizzle-orm";
import { currentClinicalLead } from "#/app/auth";
import { db } from "#/db/client";
import { hub } from "#/db/schema";
import {
  type CaseNotesResult,
  fetchClinicalCasesChartData,
  fetchClinicalCasesList,
  type HubClinicalCases,
} from "#/lib/actions/clinical/cases";

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
  if (!clinicalLead || !projectId) {
    throw new Error("Hub has no project");
  }
  const hubId = clinicalLead.profile.assignedHubId;
  const projectHubIds = db.select({ id: hub.id }).from(hub).where(eq(hub.projectId, projectId));

  const [schools, supervisorsInHub, fellowsInProject, hubs] = await Promise.all([
    db.query.school.findMany({
      where: (s, { eq }) => eq(s.hubId, hubId),
      with: {
        students: true,
        interventionSessions: {
          columns: { id: true },
          with: { session: { columns: { sessionName: true, sessionLabel: true } } },
        },
      },
    }),
    db.query.supervisor.findMany({
      where: (s, { eq }) => eq(s.hubId, hubId),
    }),
    db.query.fellow.findMany({
      where: (f, { inArray }) => inArray(f.hubId, projectHubIds),
      with: { hub: { columns: { id: true } } },
    }),
    db.query.hub.findMany({
      where: (h, { eq }) => eq(h.projectId, projectId),
      columns: { id: true, hubName: true },
    }),
  ]);

  return {
    schools,
    supervisorsInHub,
    fellowsInProject,
    currentClinicalLeadId: clinicalLead.profile.id,
    hubs,
  };
}

export type ClinicalLeadCasesType = Awaited<
  ReturnType<typeof getClinicalCasesCreatedByClinicalLead>
>[number];

export async function getClinicalCasesCreatedByClinicalLead() {
  const clinicalLead = await currentClinicalLead();
  if (!clinicalLead) throw new Error("Unauthorized");
  const clinicalLeadId = clinicalLead.profile.id;

  const cases = await db.query.clinicalScreeningInfo.findMany({
    where: (c, { eq }) => eq(c.clinicalLeadId, clinicalLeadId),
    with: {
      student: {
        with: {
          school: { columns: { schoolName: true } },
          assignedGroup: { columns: { groupName: true } },
        },
      },
      sessions: true,
      clinicalCaseNotes: {
        orderBy: (n, { desc }) => desc(n.createdAt),
        limit: 1,
        columns: { riskLevel: true },
      },
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

    const riskLevel = caseInfo.clinicalCaseNotes[0]?.riskLevel || "N/A";

    return {
      id: caseInfo.id,
      school: caseInfo.student?.school?.schoolName,
      pseudonym: caseInfo.pseudonym || "Anonymous",
      dateAdded: caseInfo.createdAt.toLocaleDateString(),
      caseStatus: caseInfo.caseStatus,
      risk: riskLevel,
      age,
      referralFrom: caseInfo.referredFrom || caseInfo.initialReferredFromSpecified || "Unknown",
      hubId: clinicalLead.profile.assignedHubId,
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
      clinicalLeadId: caseInfo.clinicalLeadId,
      role: "CLINICAL_LEAD",
      treatmentPlanUploaded: !!caseInfo.followUptreatmentPlan,
    };
  });
}
