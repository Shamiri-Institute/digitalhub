"use server";

export type StudentGroupEvaluationType = Awaited<
  ReturnType<typeof loadStudentGroupEvaluation>
>[number];

export async function loadStudentGroupEvaluation() {
  return [
    {
      id: "eval_1",
      fellowName: "John Doe",
      groupName: "45_S56",
      avgCooperation: 4,
      avgEngagement: 5,
      session: [
        {
          sessionId: "eval_1_1",
          session: "S3",
          cooperation: 4,
          engagement: 5,
        },
        {
          sessionId: "eval_1_2",
          session: "S4",
          cooperation: 4,
          engagement: 5,
        },
      ],
    },
    {
      id: "eval_2",
      fellowName: "Jane Doe",
      groupName: "21_6122",
      avgCooperation: 4,
      avgEngagement: 5,
      session: [
        {
          sessionId: "eval_2_1",
          session: "S3",
          cooperation: 4,
          engagement: 5,
        },
        {
          sessionId: "eval_2_2",
          session: "S4",
          cooperation: 4,
          engagement: 5,
        },
      ],
    },
  ];
}
