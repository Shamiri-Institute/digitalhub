import { db } from "#/lib/db";
import { type ClinicalScope, hubScope } from "./scope";

export type SupervisorClinicalCasesData = {
  supervisorName: string;
  activeStatus: string;
  noOfClinicalCases: number;
  noOfTreatmentPlans: number;
  noOfCaseNotes: number;
  sessionsHad: number;
};

export async function fetchSupervisorClinicalCasesData(scope: ClinicalScope) {
  const s = hubScope(scope, "s");

  return await db.$queryRaw<SupervisorClinicalCasesData[]>`
    WITH supervisor_stats AS (
      SELECT
        s.id AS supervisor_id,
        s."supervisor_name" AS supervisor_name,
        COUNT(DISTINCT csi.id) AS clinical_cases_count,
        COUNT(DISTINCT CASE WHEN csi."case_status" = 'Active' THEN csi.id END) AS active_cases_count,
        COUNT(DISTINCT cfutp.id) AS treatment_plans_count,
        COUNT(DISTINCT ccn.id) AS case_notes_count,
        COUNT(DISTINCT csa.id) AS sessions_count
      FROM
        supervisors s
      LEFT JOIN
        "clinical_screening_info" csi ON s.id = csi."current_supervisor_id"
      LEFT JOIN
        "clinical_follow_up_treatment_plan" cfutp ON csi.id = cfutp."case_id"
      LEFT JOIN
        "clinical_case_notes" ccn ON csi.id = ccn."case_id"
      LEFT JOIN
        "clinical_session_attendance" csa ON csi.id = csa."caseId" AND csa."supervisor_id" = s.id
      ${s.join}
      WHERE
        ${s.where}
        AND s."archived_at" IS NULL
      GROUP BY
        s.id, s."supervisor_name"
    )
    SELECT
      COALESCE(supervisor_name, 'Unknown') AS "supervisorName",
      'Active' AS "activeStatus",
      clinical_cases_count AS "noOfClinicalCases",
      treatment_plans_count AS "noOfTreatmentPlans",
      case_notes_count AS "noOfCaseNotes",
      sessions_count AS "sessionsHad"
    FROM
      supervisor_stats
    ORDER BY
      supervisor_name
  `;
}
