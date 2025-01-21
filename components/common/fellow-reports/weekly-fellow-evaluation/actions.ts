"use server";

export type WeeklyFellowEvaluationType = Awaited<
  ReturnType<typeof loadWeeklyFellowEvaluation>
>[number];

export async function loadWeeklyFellowEvaluation() {
  return [
    {
      id: "eval_1",
      fellowName: "John Doe",
      avgBehaviour: 4,
      avgProgramDelivery: 5,
      avgDressingGrooming: 4,
      week: [
        {
          evaluationId: "eval_1_1",
          week: "Week 1 15 June 2024 to 21 June 2024",
          behaviour: 4,
          programDelivery: 5,
          dressingGrooming: 4,
          attendancePunctuality: 3,
        },
        {
          evaluationId: "eval_1_2",
          week: "Week 2 22 June 2024 to 28 June 2024",
          behaviour: 4,
          programDelivery: 5,
          dressingGrooming: 4,
          attendancePunctuality: 3,
        },
        {
          evaluationId: "eval_1_3",
          week: "Week 3 29 June 2024 to 5 July 2024",
          behaviour: 4,
          programDelivery: 5,
          dressingGrooming: 4,
          attendancePunctuality: 3,
        },
      ],
    },
    {
      id: "eval_2",
      fellowName: "Jane Doe",
      avgBehaviour: 4,
      avgProgramDelivery: 5,
      avgDressingGrooming: 4,
      week: [
        {
          evaluationId: "eval_2_1",
          week: "Week 1 15 June 2024 to 21 June 2024",
          behaviour: 4,
          programDelivery: 5,
          dressingGrooming: 4,
          attendancePunctuality: 3,
        },
      ],
    },
  ];
}
