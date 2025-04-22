"use server";

export async function getOverallStudentsDataBreakdown() {
  const totalStudents = 100;
  const groupSessions = 100;
  const clinicalCases = 100;
  const clinicalSessions = 100;

  return {
    totalStudents,
    groupSessions,
    clinicalCases,
    clinicalSessions,
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
