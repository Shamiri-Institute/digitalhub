"use server";
import { currentSupervisor } from "#/app/auth";
import { objectId } from "#/lib/crypto";
import { db } from "#/lib/db";
import { generateFellowVisibleID } from "#/lib/utils";
import { FellowSchema } from "./schemas";

export async function addNewFellow(fellowData: FellowSchema) {
  try {
    const supervisor = await currentSupervisor();

    if (!supervisor) {
      return {
        success: false,
        message: "User is not authorised",
      };
    }
    const data = FellowSchema.parse(fellowData);
    const fellowsCreatedThisYearCount = await db.fellow.count({
      where: {
        createdAt: {
          gte: new Date(new Date().getFullYear(), 0, 1),
        },
      },
    });

    await db.fellow.create({
      data: {
        ...data,
        id: objectId("fellow"),
        visibleId: generateFellowVisibleID(fellowsCreatedThisYearCount),
        supervisorId: supervisor.id,
        hubId: supervisor.hubId,
        implementerId: supervisor.implementerId,
      },
    });

    return {
      success: true,
    };
  } catch (error: unknown) {
    if (error instanceof Error) {
      return { success: false, message: error.message };
    }
    return { success: false };
  }
}

export type FellowsData = Awaited<ReturnType<typeof loadFellowsData>>[number];

export async function loadFellowsData() {
  const supervisor = await currentSupervisor();

  if (!supervisor) {
    throw new Error("Unauthorised user");
  }

  const fellows = await db.fellow.findMany({
    where: {
      supervisorId: supervisor.id,
    },
    include: {
      fellowAttendances: true,
      groups: {
        include: {
          students: true,
          school: {
            include: {
              interventionSessions: {
                where: {
                  sessionDate: {
                    gte: new Date(),
                  },
                },
                orderBy: {
                  sessionDate: "asc",
                },
                take: 1,
              },
            },
          },
        },
      },
    },
  });

  return fellows.map((fellow) => ({
    county: fellow.county,
    subCounty: fellow.subCounty,
    fellowName: fellow.fellowName,
    fellowEmail: fellow.fellowEmail,
    mpesaNumber: fellow.mpesaNumber,
    mpesaName: fellow.mpesaName,
    createdAt: fellow.createdAt,
    droppedOut: fellow.droppedOut,
    droppedOutAt: fellow.droppedOutAt,
    id: fellow.id,
    sessions: fellow.groups
      .filter((group) => group.school?.interventionSessions.length)
      .map((group) => ({
        schoolName: group.school?.schoolName,
        sessionType: group.school?.interventionSessions[0]?.sessionType,
        groupName: group.groupName,
        numberOfStudents: group.students.length,
      })),
  }));
}
