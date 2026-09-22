"use server";

import { currentSupervisor } from "#/app/auth";
import { signOut } from "next-auth/react";
import { db } from "#/db/client";

export async function loadSchoolFeedback() {
  try {
    const supervisor = await currentSupervisor();

    if (!supervisor) {
      throw new Error("The session has not been authenticated");
    }

    const { profile } = supervisor;
    const hubId = profile?.hubId;
    if (!hubId) {
      await signOut({ callbackUrl: "/login" });
      throw new Error("Unauthorised user");
    }

    const schools = await db.query.school.findMany({
      where: (s, { eq }) => eq(s.hubId, hubId),
      with: {
        schoolFeedbacks: {
          with: { user: true },
          orderBy: (f, { asc }) => [asc(f.createdAt), asc(f.id)],
        },
      },
      orderBy: (s, { asc }) => [asc(s.createdAt), asc(s.id)],
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

export type SchoolFeedbackType = Awaited<ReturnType<typeof loadSchoolFeedback>>[number];
