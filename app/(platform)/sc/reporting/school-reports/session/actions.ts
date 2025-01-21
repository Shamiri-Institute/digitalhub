"use server";

import { currentSupervisor } from "#/app/auth";
import { db } from "#/lib/db";

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
          },
        },
      },
    });

    const groupedBySchool = sessions.reduce<SchoolGroup[]>((acc, session) => {
      const schoolName = session?.session?.school?.schoolName || "N/A";

      // Find the school in the accumulator
      let schoolGroup = acc.find((group) => group.schoolName === schoolName);

      if (!schoolGroup) {
        // Create a new school group if it doesn't exist
        schoolGroup = {
          schoolName,
          avgStudentBehaviour: 0,
          avgAdminSupport: 0,
          avgWorkload: 0,
          session: [],
          count: 0, // To keep track of the total count for averages
        };
        acc.push(schoolGroup);
      }

      // Add session data to the school group
      schoolGroup.session.push({
        session: session.session?.sessionName || "N/A",
        avgStudentBehaviour: session.studentBehaviorRating || 0,
        avgAdminSupport: session.adminSupportRating || 0,
        avgWorkload: session.workloadRating || 0,
      });

      // Update the totals for the school group
      schoolGroup.avgStudentBehaviour += session.studentBehaviorRating || 0;
      schoolGroup.avgAdminSupport += session.adminSupportRating || 0;
      schoolGroup.avgWorkload += session.workloadRating || 0;
      schoolGroup.count++;

      return acc;
    }, []);

    // Calculate final averages for each school
    groupedBySchool.forEach((school) => {
      school.avgStudentBehaviour = parseFloat(
        (school.avgStudentBehaviour / school.count).toFixed(2),
      );
      school.avgAdminSupport = parseFloat(
        (school.avgAdminSupport / school.count).toFixed(2),
      );
      school.avgWorkload = parseFloat(
        (school.avgWorkload / school.count).toFixed(2),
      );

      // @ts-ignore
      delete school.count;
    });

    return groupedBySchool || [];
  } catch (error) {
    console.error(error);
    return [];
  }
}

export type SessionReportType = Awaited<
  ReturnType<typeof loadSessionReport>
>[number];
