"use server";

import { currentClinicalLead } from "#/app/auth";
import { db } from "#/lib/db";

export async function getClinicalCasesData() {
  const clinicalLead = await currentClinicalLead();
  if (!clinicalLead) throw new Error("Unauthorized");

  const hubId = clinicalLead.assignedHubId;

  type StatusResult = { name: string; value: bigint };
  type SupervisorResult = { id: string; value: bigint };
  type SupervisorInfo = { id: string; supervisorName: string };

  const [
    casesByStatusResult,
    casesByRiskStatusResult,
    casesBySessionResult,
    casesBySupervisorResult,
    supervisorsResult,
  ] = await Promise.all([
    db.$queryRaw<StatusResult[]>`
      SELECT 
        "case_status" as name, 
        COUNT(*) as value
      FROM "clinical_screening_info" csi
      JOIN "supervisors" s ON csi."current_supervisor_id" = s.id
      WHERE s."hub_id" = ${hubId}
      GROUP BY "case_status"
    `,

    db.$queryRaw<StatusResult[]>`
      SELECT 
        "risk_status" as name, 
        COUNT(*) as value
      FROM "clinical_screening_info" csi
      JOIN "supervisors" s ON csi."current_supervisor_id" = s.id
      WHERE s."hub_id" = ${hubId}
      GROUP BY "risk_status"
    `,

    db.$queryRaw<StatusResult[]>`
      SELECT 
        session as name, 
        COUNT(*) as value
      FROM "clinical_session_attendance" csa
      JOIN "clinical_screening_info" csi ON csa."caseId" = csi.id
      JOIN "supervisors" s ON csi."current_supervisor_id" = s.id
      WHERE s."hub_id" = ${hubId}
      GROUP BY session
    `,

    db.$queryRaw<SupervisorResult[]>`
      SELECT 
        csi."current_supervisor_id" as id, 
        COUNT(*) as value
      FROM "clinical_screening_info" csi
      JOIN "supervisors" s ON csi."current_supervisor_id" = s.id
      WHERE s."hub_id" = ${hubId}
      GROUP BY csi."current_supervisor_id"
    `,

    db.$queryRaw<SupervisorInfo[]>`
      SELECT 
        id, 
        "supervisor_name"
      FROM "supervisors"
      WHERE "hub_id" = ${hubId}
    `,
  ]);

  const sessionTypes = ["Pre", "S1", "S2", "S3", "S4", "F1", "F2"];

  const casesBySession = sessionTypes.map((session) => {
    const sessionData = casesBySessionResult.find((s) => s.name === session);
    return {
      name: session,
      total: sessionData ? Number(sessionData.value) : 0,
    };
  });

  const casesBySupervisor = casesBySupervisorResult.map((supervisor) => {
    const sup = supervisorsResult.find((s) => s.id === supervisor.id);
    const names = sup?.supervisorName?.split(" ") ?? ["", ""];
    return {
      name: `${names[0]?.[0] ?? ""}${names[1]?.[0] ?? ""}`,
      total: Number(supervisor.value),
    };
  });

  return {
    casesByStatus: casesByStatusResult.map((status) => ({
      name: status.name,
      value: Number(status.value),
    })),
    casesByRiskStatus: casesByRiskStatusResult.map((status) => ({
      name: status.name,
      value: Number(status.value),
    })),
    casesBySession,
    casesBySupervisor,
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
  generalPresentingIssuesBaseline: Record<string, boolean> | null;
  generalPresentingIssuesEndpoint: Record<string, boolean> | null;
  generalPresentingIssuesOtherSpecifiedBaseline: string | null;
  generalPresentingIssuesOtherSpecifiedEndpoint: string | null;
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
        csi.general_presenting_issues_other_specified_baseline as "generalPresentingIssuesOtherSpecifiedBaseline",
        csi.general_presenting_issues_other_specified_endpoint as "generalPresentingIssuesOtherSpecifiedEndpoint",
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

    return cases || [];
  } catch (error) {
    console.error("Error fetching clinical cases:", error);
    return [];
  }
}
