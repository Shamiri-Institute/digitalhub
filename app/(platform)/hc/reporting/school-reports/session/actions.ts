"use server";

import { format } from "date-fns";
import { currentHubCoordinator } from "#/app/auth";
import { db } from "#/lib/db";

export async function loadSessionReport() {
  const hubCoordinator = await currentHubCoordinator();

  if (!hubCoordinator?.assignedHubId) {
    throw new Error("Hub coordinator has no assigned hub");
  }

  const schools = await db.school.findMany({
    where: {
      hubId: hubCoordinator.assignedHubId,
    },
    include: {
      interventionSessions: {
        where: {
          occurred: true,
        },
        include: {
          sessionRatings: true,
          session: true,
          sessionNotes: true,
          sessionComments: {
            include: {
              user: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
        orderBy: {
          sessionDate: "asc",
        },
      },
    },
  });

  console.log({ schools });

  const reportData = schools.map((school) => {
    const allRatings = school.interventionSessions.flatMap((session) =>
      session.sessionRatings.map((rating) => ({
        studentBehaviorRating: rating.studentBehaviorRating,
        adminSupportRating: rating.adminSupportRating,
        workloadRating: rating.workloadRating,
      })),
    );

    const avgStudentBehaviour =
      allRatings.length > 0
        ? allRatings.reduce((sum, rating) => sum + (rating.studentBehaviorRating || 0), 0) /
          allRatings.length
        : 0;

    const avgAdminSupport =
      allRatings.length > 0
        ? allRatings.reduce((sum, rating) => sum + (rating.adminSupportRating || 0), 0) /
          allRatings.length
        : 0;

    const avgWorkload =
      allRatings.length > 0
        ? allRatings.reduce((sum, rating) => sum + (rating.workloadRating || 0), 0) /
          allRatings.length
        : 0;

    const sessionGroups = school.interventionSessions.reduce(
      (acc, session) => {
        const sessionName =
          session.session?.sessionName || session.sessionName || `Session ${session.sessionType}`;

        if (!acc[sessionName]) {
          acc[sessionName] = {
            session: sessionName,
            ratings: [],
            sessionNotes: session.sessionNotes || [],
            sessionComments: session.sessionComments || [],
            schoolName: school.schoolName,
            date: session.sessionDate ? format(session.sessionDate, "dd/MM/yyyy") : "N/A",
          };
        }

        session.sessionRatings.forEach((rating) => {
          const group = acc[sessionName];
          if (group) {
            group.ratings.push({
              studentBehaviorRating: rating.studentBehaviorRating,
              adminSupportRating: rating.adminSupportRating,
              workloadRating: rating.workloadRating,
            });
          }
        });

        return acc;
      },
      {} as Record<
        string,
        {
          session: string;
          ratings: Array<{
            studentBehaviorRating: number | null;
            adminSupportRating: number | null;
            workloadRating: number | null;
          }>;
          sessionNotes: Array<{ kind: string; content: string; id: number }>;
          sessionComments: Array<{
            content: string;
            id: string;
            user: { name: string | null } | null;
            createdAt: Date;
          }>;
          schoolName: string;
          date: string;
        }
      >,
    );

    const sessionData = Object.values(sessionGroups).map((sessionGroup) => {
      const avgStudentBehaviour =
        sessionGroup.ratings.length > 0
          ? sessionGroup.ratings.reduce(
              (sum, rating) => sum + (rating.studentBehaviorRating || 0),
              0,
            ) / sessionGroup.ratings.length
          : 0;

      const avgAdminSupport =
        sessionGroup.ratings.length > 0
          ? sessionGroup.ratings.reduce(
              (sum, rating) => sum + (rating.adminSupportRating || 0),
              0,
            ) / sessionGroup.ratings.length
          : 0;

      const avgWorkload =
        sessionGroup.ratings.length > 0
          ? sessionGroup.ratings.reduce((sum, rating) => sum + (rating.workloadRating || 0), 0) /
            sessionGroup.ratings.length
          : 0;

      return {
        session: sessionGroup.session,
        avgStudentBehaviour: Math.round(avgStudentBehaviour * 10) / 10, // Round to 1 decimal place
        avgAdminSupport: Math.round(avgAdminSupport * 10) / 10,
        avgWorkload: Math.round(avgWorkload * 10) / 10,
        sessionNotes: sessionGroup.sessionNotes.map((note) => ({
          kind: note.kind,
          content: note.content,
          sessionNoteId: note.id,
        })),
        sessionComments: sessionGroup.sessionComments.map((comment) => ({
          content: comment.content,
          sessionCommentId: comment.id,
          name: comment.user?.name || "N/A",
          date: comment.createdAt,
        })),
        schoolName: sessionGroup.schoolName,
        date: sessionGroup.date,
      };
    });

    return {
      schoolName: school.schoolName,
      avgStudentBehaviour: Math.round(avgStudentBehaviour * 10) / 10,
      avgAdminSupport: Math.round(avgAdminSupport * 10) / 10,
      avgWorkload: Math.round(avgWorkload * 10) / 10,
      session: sessionData,
    };
  });

  return reportData;
}

export type SessionReportType = Awaited<ReturnType<typeof loadSessionReport>>[number];
