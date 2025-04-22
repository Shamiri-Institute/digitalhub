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
  const graphData = [{ name: "Clinical Sessions", value: 100 }];

  return graphData;
}

export async function getStudentsStatsBreakdown() {
  const studentsStats = [{ name: "Total Students", value: 100 }];

  return studentsStats;
}
