"use server";

import { currentSupervisor } from "#/app/auth";
import { db } from "#/lib/db";
import { format } from "date-fns";

type SchoolGroup = {
  schoolName: string;
  avgStudentBehaviour: number;
  avgAdminSupport: number;
  avgWorkload: number;
  session: {
    session: string;
    avgStudentBehaviour: number;
    avgAdminSupport: number;
    avgWorkload: number;
    sessionNotes: {
      kind: string;
      content: string;
      sessionNoteId: number;
    }[];
    sessionComments: {
      content: string;
      sessionCommentId: string;
      name: string;
      date: Date;
    }[];
    schoolName: string;
    date: string;
  }[];
  count: number;
};

export async function loadSessionReport() {
  try {
    const supervisor = await currentSupervisor();

    if (!supervisor) {
      throw new Error("Unauthorised user");
    }

    const sessions = await db.interventionSessionRating.findMany({
      where: {
        supervisorId: supervisor.id,
      },
      include: {
        session: {
          include: {
            school: true,
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
        },
      },
    });

    const groupedBySchool = sessions.reduce<SchoolGroup[]>((acc, session) => {
      const schoolName = session?.session?.school?.schoolName || "N/A";

      let schoolGroup = acc.find((group) => group.schoolName === schoolName);

      if (!schoolGroup) {
        schoolGroup = {
          schoolName,
          avgStudentBehaviour: 0,
          avgAdminSupport: 0,
          avgWorkload: 0,
          session: [],
          count: 0,
        };
        acc.push(schoolGroup);
      }

      schoolGroup.session.push({
        session: session.session?.sessionName || "N/A",
        avgStudentBehaviour: session.studentBehaviorRating || 0,
        avgAdminSupport: session.adminSupportRating || 0,
        avgWorkload: session.workloadRating || 0,
        sessionNotes:
          session.session?.sessionNotes.map((note) => ({
            kind: note.kind,
            content: note.content,
            sessionNoteId: note.id,
          })) || [],
        schoolName: session.session?.school?.schoolName || "N/A",
        sessionComments:
          session.session?.sessionComments.map((comment) => ({
            content: comment.content,
            sessionCommentId: comment.id,
            name: comment.user?.name || "N/A",
            date: comment.createdAt,
          })) || [],
        date: format(session.session?.sessionDate, "dd/MM/yyyy") || "N/A",
      });

      schoolGroup.avgStudentBehaviour += session.studentBehaviorRating || 0;
      schoolGroup.avgAdminSupport += session.adminSupportRating || 0;
      schoolGroup.avgWorkload += session.workloadRating || 0;
      schoolGroup.count++;

      return acc;
    }, []);

    groupedBySchool.forEach((school) => {
      school.avgStudentBehaviour = Number.parseFloat(
        (school.avgStudentBehaviour / school.count).toFixed(2),
      );
      school.avgAdminSupport = Number.parseFloat(
        (school.avgAdminSupport / school.count).toFixed(2),
      );
      school.avgWorkload = Number.parseFloat((school.avgWorkload / school.count).toFixed(2));

      // @ts-ignore
      delete school.count;
    });

    return groupedBySchool || [];
  } catch (error) {
    console.error(error);
    return [];
  }
}

export type SessionReportType = Awaited<ReturnType<typeof loadSessionReport>>[number];
