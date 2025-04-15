"use server";

import { currentClinicalLead } from "#/app/auth";
import { db } from "#/lib/db";

export type FellowClinicalCasesData = {
  fellowName: string;
  averageRating: number;
  activeStatus: string;
  casesReferred: number;
  noOfGroups: number;
  phoneNumber: string;
  supervisorName: string;
  noOfClinicalCases: number;
};

export async function getFellowClinicalCasesData() {
  const clinicalLead = await currentClinicalLead();
  if (!clinicalLead) throw new Error("Unauthorized");

  const fellowsData = await db.$queryRaw<FellowClinicalCasesData[]>`
    WITH fellow_stats AS (
      SELECT 
        f.id AS fellow_id,
        f."fellow_name" AS fellow_name,
        f."cell_number" AS phone_number,
        s."supervisor_name" AS supervisor_name,
        COUNT(DISTINCT csi.id) AS clinical_cases_count,
        COUNT(DISTINCT CASE WHEN csi."case_status" = 'Active' THEN csi.id END) AS active_cases_count,
        COUNT(DISTINCT ig.id) AS groups_count
      FROM 
        fellows f
      LEFT JOIN 
        "clinical_screening_info" csi ON f.id = csi."current_supervisor_id"
      LEFT JOIN
        "supervisors" s ON f."supervisor_id" = s.id
      LEFT JOIN
        "intervention_groups" ig ON f.id = ig."leader_id"
      WHERE 
        f."hub_id" = ${clinicalLead.assignedHubId}
        AND f."archived_at" IS NULL
      GROUP BY 
        f.id, f."fellow_name", f."cell_number", s."supervisor_name"
    ),
    referred_cases AS (
      SELECT 
        csi."initial_referred_from" AS fellow_id,
        COUNT(DISTINCT csi.id) AS referred_count
      FROM 
        "clinical_screening_info" csi
      WHERE 
        csi."initial_referred_from" IS NOT NULL
      GROUP BY 
        csi."initial_referred_from"
    ),
    fellow_ratings AS (
      SELECT 
        wfr."fellow_id",
        AVG(
          CASE 
            WHEN wfr."behaviour_rating" IS NOT NULL 
             OR wfr."program_delivery_rating" IS NOT NULL 
             OR wfr."dressing_and_grooming_rating" IS NOT NULL 
             OR wfr."punctuality_rating" IS NOT NULL 
            THEN (
              COALESCE(wfr."behaviour_rating", 0) + 
              COALESCE(wfr."program_delivery_rating", 0) + 
              COALESCE(wfr."dressing_and_grooming_rating", 0) + 
              COALESCE(wfr."punctuality_rating", 0)
            ) / 
            (
              CASE WHEN wfr."behaviour_rating" IS NOT NULL THEN 1 ELSE 0 END +
              CASE WHEN wfr."program_delivery_rating" IS NOT NULL THEN 1 ELSE 0 END +
              CASE WHEN wfr."dressing_and_grooming_rating" IS NOT NULL THEN 1 ELSE 0 END +
              CASE WHEN wfr."punctuality_rating" IS NOT NULL THEN 1 ELSE 0 END
            )
            ELSE 0
          END
        ) AS avg_rating
      FROM 
        "weekly_fellow_ratings" wfr
      GROUP BY 
        wfr."fellow_id"
    )
    SELECT 
      COALESCE(fs.fellow_name, 'Unknown') AS "fellowName",
      COALESCE(fr.avg_rating, 0) AS "averageRating",
      'Active' AS "activeStatus",
      COALESCE(rc.referred_count, 0) AS "casesReferred",
      COALESCE(fs.groups_count, 0) AS "noOfGroups",
      COALESCE(fs.phone_number, '') AS "phoneNumber",
      COALESCE(fs.supervisor_name, 'Unassigned') AS "supervisorName",
      COALESCE(fs.clinical_cases_count, 0) AS "noOfClinicalCases"
    FROM 
      fellow_stats fs
    LEFT JOIN
      referred_cases rc ON fs.fellow_id = rc.fellow_id
    LEFT JOIN
      fellow_ratings fr ON fs.fellow_id = fr.fellow_id
    ORDER BY 
      fs.fellow_name
  `;

  return fellowsData;
}
