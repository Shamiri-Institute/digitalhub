"use server";

import { currentClinicalLead } from "#/app/auth";
import { db } from "#/lib/db";

export async function getOverallStudentsDataBreakdown() {
  const clinicalLead = await currentClinicalLead();
  if (!clinicalLead) throw new Error("Unauthorized");

  const [
    totalStudentsResult,
    groupSessionsResult,
    clinicalCasesResult,
    clinicalSessionsResult,
  ] = await Promise.all([
    db.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*) as count 
      FROM students s
      JOIN schools sc ON s.school_id = sc.id
      WHERE sc.hub_id = ${clinicalLead.assignedHubId}
    `,
    db.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*) as count 
      FROM intervention_sessions ins
      JOIN session_names sn ON ins.session_id = sn.id
      WHERE sn.hub_id = ${clinicalLead.assignedHubId}
    `,
    db.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*) as count 
      FROM clinical_screening_info csi
      JOIN students sts ON sts.id = csi.student_id
      JOIN schools sc ON sts.school_id = sc.id
      WHERE sc.hub_id = ${clinicalLead.assignedHubId}
    `,
    db.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*) as count 
      FROM clinical_session_attendance cs
      JOIN clinical_screening_info csi ON csi.id = cs."caseId"
      JOIN students sts ON sts.id = csi.student_id
      JOIN schools sc ON sts.school_id = sc.id
      WHERE sc.hub_id = ${clinicalLead.assignedHubId}
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
  const graphData = [
    { name: "Total Students", value: 100 },
    { name: "Group Sessions", value: 100 },
    { name: "Clinical Cases", value: 100 },
    { name: "Clinical Sessions", value: 100 },
  ];

  return graphData;
}

export async function clinicalSessionsDataBreakdown() {
  const clinicalLead = await currentClinicalLead();
  if (!clinicalLead) throw new Error("Unauthorized");

  const [
    casesByStatus,
    casesBySession,
    casesBySupervisor,
    casesByInitialContact,
  ] = await Promise.all([
    db.$queryRaw<{ caseStatus: string | null; count: bigint }[]>`
      SELECT case_status as "caseStatus", COUNT(*) as count
      FROM clinical_screening_info csi
      JOIN students s ON s.id = csi.student_id
      JOIN schools sc ON s.school_id = sc.id
      WHERE sc.hub_id = ${clinicalLead.assignedHubId}
      GROUP BY case_status
      ORDER BY count DESC
    `,

    db.$queryRaw<{ session: string | null; count: bigint }[]>`
      SELECT session, COUNT(*) as count
      FROM clinical_session_attendance csa
      JOIN clinical_screening_info csi ON csi.id = csa."caseId"
      JOIN students s ON s.id = csi.student_id
      JOIN schools sc ON s.school_id = sc.id
      WHERE sc.hub_id = ${clinicalLead.assignedHubId}
      GROUP BY session
      ORDER BY count DESC
    `,

    db.$queryRaw<{ supervisorName: string | null; count: bigint }[]>`
      SELECT sp.supervisor_name as "supervisorName", COUNT(*) as count
      FROM clinical_screening_info csi
      JOIN students s ON s.id = csi.student_id
      JOIN supervisors sp ON sp.id = csi.current_supervisor_id
      WHERE sp.hub_id = ${clinicalLead.assignedHubId}
      GROUP BY sp.supervisor_name
      ORDER BY count DESC
    `,

    db.$queryRaw<{ initialReferredFrom: string | null; count: bigint }[]>`
      SELECT initial_referred_from_specified as "initialReferredFrom", COUNT(*) as count
      FROM clinical_screening_info csi
      JOIN students s ON s.id = csi.student_id
      JOIN schools sc ON s.school_id = sc.id
      WHERE sc.hub_id = ${clinicalLead.assignedHubId}
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
  const clinicalLead = await currentClinicalLead();
  if (!clinicalLead) throw new Error("Unauthorized");

  const [formStats, ageStats, genderStats] = await Promise.all([
    db.$queryRaw<{ form: number | null; count: bigint }[]>`
      SELECT form, COUNT(*) as count 
      FROM students s
      JOIN schools sc ON s.school_id = sc.id
      WHERE sc.hub_id = ${clinicalLead.assignedHubId}
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
      WHERE sc.hub_id = ${clinicalLead.assignedHubId}
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
      WHERE sc.hub_id = ${clinicalLead.assignedHubId}
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
