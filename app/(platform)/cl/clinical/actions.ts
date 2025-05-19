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
      LEFT JOIN "supervisors" s ON csi."current_supervisor_id" = s.id
      WHERE (s."hub_id" = ${hubId} OR csi."clinicalLeadId" = ${clinicalLead.id})
      GROUP BY "case_status"
    `,

    db.$queryRaw<StatusResult[]>`
      SELECT 
        "risk_status" as name, 
        COUNT(*) as value
      FROM "clinical_screening_info" csi
      LEFT JOIN "supervisors" s ON csi."current_supervisor_id" = s.id
      WHERE (s."hub_id" = ${hubId} OR csi."clinicalLeadId" = ${clinicalLead.id})
      GROUP BY "risk_status"
    `,

    db.$queryRaw<StatusResult[]>`
      SELECT 
        session as name, 
        COUNT(*) as value
      FROM "clinical_session_attendance" csa
      JOIN "clinical_screening_info" csi ON csa."caseId" = csi.id
      LEFT JOIN "supervisors" s ON csi."current_supervisor_id" = s.id
      WHERE (s."hub_id" = ${hubId} OR csi."clinicalLeadId" = ${clinicalLead.id})
      GROUP BY session
    `,

    db.$queryRaw<SupervisorResult[]>`
      SELECT 
        COALESCE(csi."current_supervisor_id", 'CLINICAL_LEAD') as id, 
        COUNT(*) as value
      FROM "clinical_screening_info" csi
      LEFT JOIN "supervisors" s ON csi."current_supervisor_id" = s.id
      WHERE (s."hub_id" = ${hubId} OR csi."clinicalLeadId" = ${clinicalLead.id})
      GROUP BY COALESCE(csi."current_supervisor_id", 'CLINICAL_LEAD')
    `,

    db.$queryRaw<SupervisorInfo[]>`
      SELECT 
        id, 
        "supervisor_name"
      FROM "supervisors"
      WHERE "hub_id" = ${hubId}
      UNION ALL
      SELECT 
        'CLINICAL_LEAD' as id,
        'Clinical Lead' as "supervisor_name"
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
    if (supervisor.id === "CLINICAL_LEAD") {
      return {
        name: "CL",
        total: Number(supervisor.value),
      };
    }
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
  clinicalLeadId: string;
  isClinicalLeadCase: boolean;
  caseNotes: Array<{
    id: string;
    createdAt: Date;
    presentingIssues: string;
    orsAssessment: number;
    riskLevel: string;
    necessaryConditions: string;
    treatmentInterventions: string[];
    otherIntervention: string;
    interventionExplanation: string;
    emotionalResponse: string;
    behavioralResponse: string;
    overallFeedback: string;
    studentResponseExplanations: string;
    followUpPlan: string;
    followUpPlanExplanation: string;
    sessionId: string;
  }>;
  termination: {
    id: string;
    createdAt: Date;
    terminationDate: Date;
    terminationReason: string;
    terminationReasonExplanation: string;
    sessionId: string;
  } | null;
};

export async function getClinicalCasesInHub(): Promise<HubClinicalCases[]> {
  try {
    const clinicalLead = await currentClinicalLead();
    if (!clinicalLead) throw new Error("Unauthorized");

    const cases = await db.$queryRaw`
      WITH case_notes AS (
        SELECT 
          ccn.case_id,
          json_agg(
            json_build_object(
              'id', ccn.id,
              'createdAt', ccn.created_at,
              'presentingIssues', ccn.presenting_issues,
              'orsAssessment', ccn.ors_assessment,
              'riskLevel', ccn.risk_level,
              'necessaryConditions', ccn.necessary_conditions,
              'treatmentInterventions', ccn.treatment_interventions,
              'otherIntervention', ccn.other_intervention,
              'interventionExplanation', ccn.intervention_explanation,
              'studentResponseExplanations', ccn.student_response_explanations,
              'followUpPlan', ccn.follow_up_plan,
              'followUpPlanExplanation', ccn.follow_up_plan_explanation,
              'sessionId', ccn.session_id
            )
          ) AS notes_data
        FROM "clinical_case_notes" ccn
        GROUP BY ccn.case_id
      ),
      case_termination AS (
        SELECT 
          cct.case_id,
          json_build_object(
            'id', cct.id,
            'createdAt', cct.created_at,
            'terminationDate', cct.termination_date,
            'terminationReason', cct.termination_reason,
            'terminationReasonExplanation', cct.termination_reason_explanation,
            'sessionId', cct.session_id
          ) AS termination_data
        FROM "clinical_case_termination" cct
      )
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
        csi."clinicalLeadId" as "clinicalLeadId",
        CASE WHEN csi."clinicalLeadId" = ${clinicalLead.id} THEN true ELSE false END as "isClinicalLeadCase",
        CASE WHEN csfp.id IS NOT NULL THEN true ELSE false END as "treatmentPlan",
        CASE WHEN EXISTS (
          SELECT 1 FROM "clinical_case_notes" ccn 
          WHERE ccn."case_id" = csi.id
        ) THEN true ELSE false END as "hasNotes",
        COALESCE(s.supervisor_name, 'CLINICAL_LEAD') as "supervisor",
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
        ) as "upcomingSession",
        COALESCE(cn.notes_data, '[]'::json) as "caseNotes",
        ct.termination_data as "termination"
      FROM 
        "clinical_screening_info" csi
      LEFT JOIN 
        "supervisors" s ON csi."current_supervisor_id" = s.id
      JOIN 
        "students" st ON csi."student_id" = st.id
      JOIN 
        "schools" sch ON st."school_id" = sch.id
      JOIN 
        "hubs" h ON sch."hub_id" = h.id
      LEFT JOIN
        "clinical_follow_up_treatment_plan" csfp ON csi.id = csfp."case_id"
      LEFT JOIN
        case_notes cn ON csi.id = cn.case_id
      LEFT JOIN
        case_termination ct ON csi.id = ct.case_id
      WHERE 
        (s."hub_id" = ${clinicalLead.assignedHubId})
      ORDER BY 
        csi.id DESC
    `;

    return cases as HubClinicalCases[];
  } catch (error) {
    console.error("Error fetching clinical cases:", error);
    return [];
  }
}

export async function getSchoolsInClinicalLeadHub() {
  const clinicalLead = await currentClinicalLead();

  const [schools, supervisorsInHub, fellowsInHub] = await Promise.all([
    db.school.findMany({
      where: {
        hubId: clinicalLead?.assignedHubId,
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
        hubId: clinicalLead?.assignedHubId,
      },
    }),
    db.fellow.findMany({
      where: {
        hubId: clinicalLead?.assignedHubId,
      },
    }),
  ]);

  return {
    schools,
    supervisorsInHub,
    fellowsInHub,
    currentClinicalLeadId: clinicalLead!.id,
  };
}

export async function getClinicalCasesCreatedByClinicalLead() {
  const clinicalLead = await currentClinicalLead();

  const cases = await db.clinicalScreeningInfo.findMany({
    where: {
      clinicalLeadId: clinicalLead?.id,
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
      hubId: clinicalLead?.assignedHubId,
      flagged: caseInfo.flagged,
      flaggedReason: caseInfo.flaggedReason,
      sessionAttendanceHistory: formattedSessions,
      student: caseInfo.student,
      emergencyPresentingIssuesBaseline:
        caseInfo.emergencyPresentingIssuesBaseline,
      generalPresentingIssuesBaseline: caseInfo.generalPresentingIssuesBaseline,
      emergencyPresentingIssuesEndpoint:
        caseInfo.emergencyPresentingIssuesEndpoint,
      generalPresentingIssuesEndpoint: caseInfo.generalPresentingIssuesEndpoint,
      generalPresentingIssuesOtherSpecifiedBaseline:
        caseInfo.generalPresentingIssuesOtherSpecifiedBaseline,
      generalPresentingIssuesOtherSpecifiedEndpoint:
        caseInfo.generalPresentingIssuesOtherSpecifiedEndpoint,
      clinicalSessionAttendance: caseInfo.sessions,
      currentSupervisorId: caseInfo.currentSupervisorId,
      clinicalCaseNotes: caseInfo.clinicalCaseNotes,
      clinicalLeadId: caseInfo.clinicalLeadId,
    };
  });
}
