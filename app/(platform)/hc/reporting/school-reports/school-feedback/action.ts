"use server";

export async function loadSchoolFeedback() {
  return [
    {
      schoolName: "School 1",
      studentTeacherSatisfaction: 3,
    },
    {
      schoolName: "School 2",
      studentTeacherSatisfaction: 4,
    },
    {
      schoolName: "School 3",
      studentTeacherSatisfaction: 5,
    },
    {
      schoolName: "School 4",
      studentTeacherSatisfaction: 2,
    },
    {
      schoolName: "School 5",
      studentTeacherSatisfaction: 1.4,
    },
  ];
}

export type SchoolFeedbackType = Awaited<
  ReturnType<typeof loadSchoolFeedback>
>[number];
