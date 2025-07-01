"use server";

import { currentClinicalTeam } from "#/app/auth";
import { CURRENT_PROJECT_ID } from "#/lib/constants";
import { db } from "#/lib/db";

export async function getOverallStudentsDataBreakdown() {
  const clinicalTeam = await currentClinicalTeam();
  if (!clinicalTeam) throw new Error("Unauthorized");

  const [totalStudentsResult, groupSessionsResult, clinicalCasesResult, clinicalSessionsResult] =
    await Promise.all([
      db.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*) as count 
      FROM students s
      JOIN schools sc ON s.school_id = sc.id
      JOIN hubs h ON sc.hub_id = h.id
      WHERE h."project_id" = ${CURRENT_PROJECT_ID}
    `,
      db.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*) as count 
      FROM intervention_sessions ins
      JOIN session_names sn ON ins.session_id = sn.id
      JOIN hubs h ON sn.hub_id = h.id
      WHERE h."project_id" = ${CURRENT_PROJECT_ID}
    `,
      db.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*) as count 
      FROM clinical_screening_info csi
      JOIN students sts ON sts.id = csi.student_id
      JOIN schools sc ON sts.school_id = sc.id
      JOIN hubs h ON sc.hub_id = h.id
      WHERE h."project_id" = ${CURRENT_PROJECT_ID}
    `,
      db.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*) as count 
      FROM clinical_session_attendance cs
      JOIN clinical_screening_info csi ON csi.id = cs."caseId"
      JOIN students sts ON sts.id = csi.student_id
      JOIN schools sc ON sts.school_id = sc.id
      JOIN hubs h ON sc.hub_id = h.id
      WHERE h."project_id" = ${CURRENT_PROJECT_ID}
    `,
    ]);

  return {
    totalStudents: Number(totalStudentsResult[0].count),
    groupSessions: Number(groupSessionsResult[0].count),
    clinicalCases: Number(clinicalCasesResult[0].count),
    clinicalSessions: Number(clinicalSessionsResult[0].count),
  };
}

export async function getStudentsDataBreakdown() {
  const clinicalTeam = await currentClinicalTeam();
  if (!clinicalTeam) throw new Error("Unauthorized");

  const [attendanceData, dropoutData, completionData, ratingsData] = await Promise.all([
    db.$queryRaw<{ sessionName: string | null; count: bigint }[]>`
      SELECT 
        sn.session_name as "sessionName",
        COUNT(DISTINCT sa.student_id) as count
      FROM student_attendances sa
      JOIN students s ON s.id = sa.student_id
      JOIN schools sc ON s.school_id = sc.id
      JOIN intervention_sessions ins ON ins.id = sa.session_id
      JOIN session_names sn ON sn.id = ins.session_id
      JOIN hubs h ON sn.hub_id = h.id
      WHERE h."project_id" = ${CURRENT_PROJECT_ID}
      AND sa.attended = true
      GROUP BY sn.session_name
      ORDER BY sn.session_name ASC
    `,

    db.$queryRaw<{ reason: string | null; count: bigint }[]>`
      SELECT drop_out_reason as reason, COUNT(*) as count
      FROM students s
      JOIN schools sc ON s.school_id = sc.id
      JOIN hubs h ON sc.hub_id = h.id
      WHERE h."project_id" = ${CURRENT_PROJECT_ID}
      AND drop_out_reason IS NOT NULL
      GROUP BY drop_out_reason
      ORDER BY count DESC
    `,

    db.$queryRaw<{ name: string; value: number }[]>`
      WITH total_students AS (
        SELECT COUNT(*) as total
        FROM students s
        JOIN schools sc ON s.school_id = sc.id
        JOIN hubs h ON sc.hub_id = h.id
        WHERE h."project_id" = ${CURRENT_PROJECT_ID}
      ),
      incomplete_students_data AS (
        SELECT COUNT(*) as incomplete
        FROM students s
        JOIN schools sc ON s.school_id = sc.id
        JOIN hubs h ON sc.hub_id = h.id
        WHERE h."project_id" = ${CURRENT_PROJECT_ID}
        AND (
          s.student_name IS NULL
          OR s.gender IS NULL
          OR s.year_of_birth IS NULL
          OR s.form IS NULL
        )
      )
      SELECT 
        'actual' as name,
        CASE 
          WHEN total = 0 THEN 0
          ELSE ROUND((incomplete::float / NULLIF(total, 0)::float) * 100)
        END as value
      FROM total_students, incomplete_students_data
      UNION ALL
      SELECT 
        'target' as name,
        0 as value
      `,

    db.$queryRaw<
      {
        session_name: string | null;
        avg_student_behavior_rating: number | null;
      }[]
    >`
      SELECT sn.session_name, AVG(isr.student_behavior_rating) as avg_student_behavior_rating
      FROM intervention_session_ratings isr
      JOIN intervention_sessions ins ON ins.id = isr.session_id
      JOIN session_names sn ON sn.id = ins.session_id
      JOIN hubs h ON sn.hub_id = h.id
      WHERE h."project_id" = ${CURRENT_PROJECT_ID}
      GROUP BY sn.session_name
      ORDER BY sn.session_name ASC
    `,
  ]);

  return {
    attendanceData: attendanceData.map((item) => ({
      name: item.sessionName || "Unknown",
      value: Number(item.count),
    })),
    dropoutData: dropoutData.map((item) => ({
      name: item.reason || "Unknown",
      value: Number(item.count),
    })),
    completionData: completionData,
    ratingsData: ratingsData.map((item) => ({
      session: item.session_name || "Unknown",
      value: item.avg_student_behavior_rating ? Number(item.avg_student_behavior_rating) : 0,
    })),
  };
}

export async function clinicalSessionsDataBreakdown() {
  const clinicalTeam = await currentClinicalTeam();
  if (!clinicalTeam) throw new Error("Unauthorized");

  const [casesByStatus, casesBySession, casesBySupervisor, casesByInitialContact] =
    await Promise.all([
      db.$queryRaw<{ caseStatus: string | null; count: bigint }[]>`
      SELECT case_status as "caseStatus", COUNT(*) as count
      FROM clinical_screening_info csi
      JOIN students s ON s.id = csi.student_id
      JOIN schools sc ON s.school_id = sc.id
      JOIN hubs h ON sc.hub_id = h.id
      WHERE h."project_id" = ${CURRENT_PROJECT_ID}
      GROUP BY case_status
      ORDER BY count DESC
    `,

      db.$queryRaw<{ session: string | null; count: bigint }[]>`
      SELECT session, COUNT(*) as count
      FROM clinical_session_attendance csa
      JOIN clinical_screening_info csi ON csi.id = csa."caseId"
      JOIN students s ON s.id = csi.student_id
      JOIN schools sc ON s.school_id = sc.id
      JOIN hubs h ON sc.hub_id = h.id
      WHERE h."project_id" = ${CURRENT_PROJECT_ID}
      GROUP BY session
      ORDER BY count DESC
    `,

      db.$queryRaw<{ supervisorName: string | null; count: bigint }[]>`
      SELECT sp.supervisor_name as "supervisorName", COUNT(*) as count
      FROM clinical_screening_info csi
      JOIN students s ON s.id = csi.student_id
      JOIN supervisors sp ON sp.id = csi.current_supervisor_id
      JOIN hubs h ON sp.hub_id = h.id
      WHERE h."project_id" = ${CURRENT_PROJECT_ID}
      GROUP BY sp.supervisor_name
      ORDER BY count DESC
    `,

      db.$queryRaw<{ initialReferredFrom: string | null; count: bigint }[]>`
      SELECT initial_referred_from_specified as "initialReferredFrom", COUNT(*) as count
      FROM clinical_screening_info csi
      JOIN students s ON s.id = csi.student_id
      JOIN schools sc ON s.school_id = sc.id
      JOIN hubs h ON sc.hub_id = h.id
      WHERE h."project_id" = ${CURRENT_PROJECT_ID}
      GROUP BY initial_referred_from_specified
      ORDER BY count DESC
    `,
    ]);

  return {
    casesByStatus: casesByStatus.map((item) => ({
      name: item.caseStatus || "Unknown",
      value: Number(item.count),
    })),
    casesBySession: casesBySession.map((item) => ({
      name: item.session || "Unknown",
      value: Number(item.count),
    })),
    casesBySupervisor: casesBySupervisor.map((item) => ({
      name: item.supervisorName || "Unknown",
      value: Number(item.count),
    })),
    casesByInitialContact: casesByInitialContact.map((item) => ({
      name: item.initialReferredFrom || "Unknown",
      value: Number(item.count),
    })),
  };
}

export async function getStudentsStatsBreakdown() {
  const clinicalTeam = await currentClinicalTeam();
  if (!clinicalTeam) throw new Error("Unauthorized");

  const [formStats, ageStats, genderStats] = await Promise.all([
    db.$queryRaw<{ form: number | null; count: bigint }[]>`
      SELECT form, COUNT(*) as count 
      FROM students s
      JOIN schools sc ON s.school_id = sc.id
      JOIN hubs h ON sc.hub_id = h.id
      WHERE h."project_id" = ${CURRENT_PROJECT_ID}
      GROUP BY form
      ORDER BY form ASC
    `,

    db.$queryRaw<{ age: number | null; count: bigint }[]>`
      SELECT 
        CASE 
          WHEN year_of_birth IS NULL THEN NULL
          ELSE EXTRACT(YEAR FROM CURRENT_DATE) - year_of_birth
        END as age,
        COUNT(*) as count
      FROM students s
      JOIN schools sc ON s.school_id = sc.id
      JOIN hubs h ON sc.hub_id = h.id
      WHERE h."project_id" = ${CURRENT_PROJECT_ID}
      GROUP BY 
        CASE 
          WHEN year_of_birth IS NULL THEN NULL
          ELSE EXTRACT(YEAR FROM CURRENT_DATE) - year_of_birth
        END
      ORDER BY age ASC
    `,

    db.$queryRaw<{ gender: string | null; count: bigint }[]>`
      SELECT gender, COUNT(*) as count 
      FROM students s
      JOIN schools sc ON s.school_id = sc.id
      JOIN hubs h ON sc.hub_id = h.id
      WHERE h."project_id" = ${CURRENT_PROJECT_ID}
      GROUP BY gender
      ORDER BY gender ASC
    `,
  ]);

  return {
    formStats: formStats.map((stat) => ({
      form: stat.form ? `Form ${stat.form}` : "N/A",
      value: Number(stat.count),
    })),
    ageStats: ageStats.map((stat) => ({
      age: stat.age ? `${stat.age} years` : "N/A",
      value: Number(stat.count),
    })),
    genderStats: genderStats.map((stat) => ({
      gender: stat.gender || "N/A",
      value: Number(stat.count),
    })),
  };
}
