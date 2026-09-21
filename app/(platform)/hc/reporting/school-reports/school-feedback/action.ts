"use server";

import { currentHubCoordinator } from "#/app/auth";
import { db } from "#/db/client";

export async function loadHubSchoolFeedback() {
  try {
    const hubCoordinator = await currentHubCoordinator();

    if (!hubCoordinator) {
      throw new Error("The session has not been authenticated");
    }

    const assignedHubId = hubCoordinator.profile?.assignedHubId;

    const schools = await db.query.school.findMany({
      where: (s, { eq, isNull }) =>
        assignedHubId === null ? isNull(s.hubId) : eq(s.hubId, assignedHubId),
      with: {
        schoolFeedbacks: { with: { user: true } },
      },
    });

    const formattedData = schools.map((school) => {
      const studentTeacherSatisfaction =
        school.schoolFeedbacks.reduce(
          (acc, curr) => acc + (curr?.studentTeacherSatisfactionRating ?? 0),
          0,
        ) / school.schoolFeedbacks.length;
      return {
        schoolName: school.schoolName,
        studentTeacherSatisfaction,
        supervisorRatings: school.schoolFeedbacks.map((feedback) => ({
          studentTeacherSatisfaction: feedback.studentTeacherSatisfactionRating,
          userId: feedback.userId,
          supervisorName: feedback.user.name,
          feedbackId: feedback.id,
          programImpactOnStudents: feedback.programImpactOnStudents,
          concernsRaisedByTeachers: feedback.concernsRaisedByTeachers,
          factorsInfluencedStudentParticipation: feedback.factorsInfluencedStudentParticipation,
        })),
      };
    });

    return formattedData || [];
  } catch (error) {
    console.error(error);
    return [];
  }
}

export type SchoolFeedbackType = Awaited<ReturnType<typeof loadHubSchoolFeedback>>[number];
