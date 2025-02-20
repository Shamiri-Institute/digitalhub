"use server";

import { db } from "#/lib/db";

export async function getClinicalCases() {
  return [
    {
      id: 1,
      school: "Olympic Secondary School",
      pseudonym: "Ben Tendo",
      dateAdded: "2024-01-01",
      caseStatus: "Active",
      risk: "High",
      age: "20 yrs",
      referralFrom: "Fellow",
      emergencyPresentingIssues: [
        {
          emergencyPresentingIssues: "Bullying",
          lowRisk: true,
          moderateRisk: false,
          highRisk: false,
          severeRisk: false,
        },
        {
          emergencyPresentingIssues: "Substance abuse",
          lowRisk: false,
          moderateRisk: true,
          highRisk: false,
          severeRisk: false,
        },
        {
          emergencyPresentingIssues: "Sexual abuse",
          lowRisk: false,
          moderateRisk: false,
          highRisk: true,
          severeRisk: false,
        },
        {
          emergencyPresentingIssues: "Suicidality",
          lowRisk: false,
          moderateRisk: false,
          highRisk: false,
          severeRisk: true,
        },
        {
          emergencyPresentingIssues: "Self-harm",
          lowRisk: true,
          moderateRisk: false,
          highRisk: false,
          severeRisk: false,
        },
        {
          emergencyPresentingIssues: "Child abuse",
          lowRisk: false,
          moderateRisk: false,
          highRisk: true,
          severeRisk: false,
        },
      ],
      generalPresentingIssues: [
        {
          generalPresentingIssues: "Academic issues",
          lowRisk: false,
          moderateRisk: true,
          highRisk: false,
          severeRisk: false,
        },
        {
          generalPresentingIssues: "Family issues",
          lowRisk: true,
          moderateRisk: false,
          highRisk: false,
          severeRisk: false,
        },
        {
          generalPresentingIssues: "Peer pressure",
          lowRisk: false,
          moderateRisk: false,
          highRisk: true,
          severeRisk: false,
        },
        {
          generalPresentingIssues: "Romantic relationship issues",
          lowRisk: true,
          moderateRisk: false,
          highRisk: false,
          severeRisk: false,
        },
        {
          generalPresentingIssues: "Self esteem issues",
          lowRisk: false,
          moderateRisk: false,
          highRisk: false,
          severeRisk: true,
        },
      ],

      sessionAttendanceHistory: [
        {
          sessionId: "1",
          session: "Clinical S1",
          sessionDate: "2024-01-01",
          attendanceStatus: true,
        },
        {
          sessionId: "2",
          session: "Clinical S2",
          sessionDate: "2024-01-02",
          attendanceStatus: false,
        },
        {
          sessionId: "3",
          session: "Clinical S3",
          sessionDate: "2024-01-03",
          attendanceStatus: null,
        },
        {
          sessionId: "4",
          session: "Clinical S4",
          sessionDate: "2024-01-04",
          attendanceStatus: true,
        },
      ],
    },
  ];
}

export type ClinicalCases = Awaited<
  ReturnType<typeof getClinicalCases>
>[number];

export async function updateClinicalSessionAttendance(
  sessionId: string,
  attendanceStatus: boolean | null,
) {
  try {
    await db.clinicalSessionAttendance.update({
      where: {
        id: sessionId,
      },
      data: {
        // @ts-ignore
        attendanceStatus: attendanceStatus,
      },
    });

    return {
      success: true,
      message: "Attendance updated successfully",
    };
  } catch (error) {
    console.error(error);
    return {
      success: false,
      message: "Failed to update attendance",
    };
  }
}
