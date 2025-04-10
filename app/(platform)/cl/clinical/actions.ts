"use server";

import { currentClinicalLead } from "#/app/auth";
import { db } from "#/lib/db";

export async function getClinicalCasesData() {
  const clinicalLead = await currentClinicalLead();
  if (!clinicalLead) throw new Error("Unauthorized");

  // Get cases by status
  const casesByStatus = await db.clinicalScreeningInfo.groupBy({
    by: ["caseStatus"],
    where: {
      currentSupervisor: {
        hubId: clinicalLead.assignedHubId,
      },
    },
    _count: true,
  });

  // Get cases by risk status
  const casesByRiskStatus = await db.clinicalScreeningInfo.groupBy({
    by: ["riskStatus"],
    where: {
      currentSupervisor: {
        hubId: clinicalLead.assignedHubId,
      },
    },
    _count: true,
  });

  // Get cases by session
  const sessionTypes = ["pre", "s1", "s2", "s3", "s4", "f1", "f2", "f3", "f4"];
  const casesBySession = await db.clinicalSessionAttendance.groupBy({
    by: ["session"],
    where: {
      case: {
        currentSupervisor: {
          hubId: clinicalLead.assignedHubId,
        },
      },
    },
    _count: true,
  });

  // Get cases by supervisor
  const casesBySupervisor = await db.clinicalScreeningInfo.groupBy({
    by: ["currentSupervisorId"],
    where: {
      currentSupervisor: {
        hubId: clinicalLead.assignedHubId,
      },
    },
    _count: true,
  });

  const supervisors = await db.supervisor.findMany({
    where: {
      id: {
        in: casesBySupervisor.map((c) => c.currentSupervisorId),
      },
    },
    select: {
      id: true,
      supervisorName: true,
    },
  });

  return {
    casesByStatus: casesByStatus.map((status) => ({
      name: status.caseStatus,
      value: status._count,
    })),
    casesByRiskStatus: casesByRiskStatus.map((status) => ({
      name: status.riskStatus,
      value: status._count,
    })),
    casesBySession: sessionTypes.map((session) => ({
      name: session,
      total: casesBySession.find((s) => s.session === session)?._count ?? 0,
    })),
    casesBySupervisor: casesBySupervisor.map((supervisor) => {
      const sup = supervisors.find(
        (s) => s.id === supervisor.currentSupervisorId,
      );
      const names = sup?.supervisorName?.split(" ") ?? ["", ""];
      return {
        name: `${names[0]?.[0] ?? ""}${names[1]?.[0] ?? ""}`,
        total: supervisor._count,
      };
    }),
  };
}

export type HubClinicalCases = {
  id: string;
  pseudonym: string;
  flagged: boolean;
  riskStatus: string;
  caseReport: string;
  treatmentPlan: boolean;
  hasNotes: boolean;
  supervisor: string;
  hub: string;
  school: string;
  noOfClinicalSessions: number;
  upcomingSession: string | null;
  initialContact: string | null;
  caseStatus: string;
  emergencyPresentingIssuesBaseline: Record<string, unknown> | null;
  emergencyPresentingIssuesEndpoint: Record<string, unknown> | null;
  generalPresentingIssuesBaseline: Record<string, unknown> | null;
  generalPresentingIssuesEndpoint: Record<string, unknown> | null;
};

export async function getClinicalCases(): Promise<HubClinicalCases[]> {
  try {
    const clinicalLead = await currentClinicalLead();
    if (!clinicalLead) throw new Error("Unauthorized");

    const cases: HubClinicalCases[] = await db.$queryRaw`
      SELECT 
        csi.id,
        csi.pseudonym,
        csi.flagged,
        csi.risk_status as "riskStatus",
        csi.case_report as "caseReport",
        csi.case_status as "caseStatus",
        csi.initial_referred_from_specified as "initialContact",
        csi.emergency_presenting_issues_baseline as "emergencyPresentingIssuesBaseline",
        csi.emergency_presenting_issues_endpoint as "emergencyPresentingIssuesEndpoint",
        csi.general_presenting_issues_baseline as "generalPresentingIssuesBaseline",
        csi.general_presenting_issues_endpoint as "generalPresentingIssuesEndpoint",
        CASE WHEN csfp.id IS NOT NULL THEN true ELSE false END as "treatmentPlan",
        CASE WHEN EXISTS (
          SELECT 1 FROM "clinical_case_notes" ccn 
          WHERE ccn."case_id" = csi.id
        ) THEN true ELSE false END as "hasNotes",
        s.supervisor_name as "supervisor",
        h.hub_name as "hub",
        sch.school_name as "school",
        (
          SELECT CAST(COUNT(*) AS INTEGER)
          FROM "clinical_session_attendance" csa 
          WHERE csa."caseId" = csi.id
        ) as "noOfClinicalSessions",
        (
          SELECT csa.session 
          FROM "clinical_session_attendance" csa 
          WHERE csa."caseId" = csi.id 
          ORDER BY csa.date DESC 
          LIMIT 1
        ) as "upcomingSession"
      FROM 
        "clinical_screening_info" csi
      JOIN 
        "supervisors" s ON csi."current_supervisor_id" = s.id
      JOIN 
        "students" st ON csi."student_id" = st.id
      JOIN 
        "schools" sch ON st."school_id" = sch.id
      JOIN 
        "hubs" h ON sch."hub_id" = h.id
      LEFT JOIN
        "clinical_follow_up_treatment_plan" csfp ON csi.id = csfp."case_id"
      WHERE 
        s."hub_id" = ${clinicalLead.assignedHubId}
      ORDER BY 
        csi.id DESC
    `;

    console.log({ cases });

    return cases || [];
  } catch (error) {
    console.error("Error fetching clinical cases:", error);
    return [];
  }
}
// Monique McClour
