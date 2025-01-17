"use server";

export async function loadSessionReport() {
  return [
    {
      schoolName: "School 1",
      avgStudentBehaviour: 4.5,
      avgAdminSupport: 4.2,
      avgWorkload: 3.8,
      session: [
        {
          session: "Session 1",
          avgStudentBehaviour: 4.5,
          avgAdminSupport: 4.2,
          avgWorkload: 3.8,
        },
        {
          session: "Session 2",
          avgStudentBehaviour: 4.1,
          avgAdminSupport: 4.3,
          avgWorkload: 3.7,
        },
      ],
    },
    {
      schoolName: "School 2",
      avgStudentBehaviour: 4.2,
      avgAdminSupport: 4.5,
      avgWorkload: 3.9,
      session: [
        {
          session: "Session 2",
          avgStudentBehaviour: 4.1,
          avgAdminSupport: 4.3,
          avgWorkload: 3.7,
        },
      ],
    },
  ];
}

export type SessionReportType = Awaited<
  ReturnType<typeof loadSessionReport>
>[number];
