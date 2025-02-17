"use server";
import { currentSupervisor } from "#/app/auth";
import { db } from "#/lib/db";
import { Fellow } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  DropoutFellowSchema,
  MarkSessionOccurrenceSchema,
  WeeklyFellowRatingSchema,
} from "./schemas";

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
      fellowAttendances: {
        include: {
          session: {
            include: {
              session: true,
              school: true,
            },
          },
          group: true,
          PayoutStatements: {
            orderBy: {
              createdAt: "desc",
            },
          },
        },
      },
      weeklyFellowRatings: true,
      groups: {
        include: {
          interventionGroupReports: {
            include: {
              session: true,
            },
          },
          students: {
            include: {
              clinicalCases: true,
              _count: {
                select: {
                  clinicalCases: true,
                },
              },
            },
          },
          school: {
            include: {
              interventionSessions: {
                orderBy: {
                  sessionDate: "asc",
                },
                include: {
                  session: true,
                },
              },
            },
          },
        },
      },
      fellowComplaints: {
        include: {
          user: true,
        },
      },
    },
  });

  const fellowAverageRatings = await db.$queryRaw<
    {
      id: string;
      averageRating: number;
    }[]
  >`
      SELECT
        f.id,
        (AVG(wfr.behaviour_rating) + AVG(wfr.dressing_and_grooming_rating) + AVG(wfr.program_delivery_rating) + AVG(wfr.punctuality_rating)) / 4 AS "averageRating"
      FROM
        fellows f
          LEFT JOIN weekly_fellow_ratings wfr ON f.id = wfr.fellow_id
      WHERE f.hub_id =${supervisor.hubId}
      GROUP BY
        f.id
  `;

  const supervisors = await db.supervisor.findMany({
    where: {
      hubId: supervisor.hubId,
    },
    include: {
      fellows: { select: { id: true, fellowName: true } },
    },
  });

  return fellows.map((fellow) => ({
    county: fellow.county,
    subCounty: fellow.subCounty,
    fellowName: fellow.fellowName,
    fellowEmail: fellow.fellowEmail,
    cellNumber: fellow.cellNumber,
    mpesaNumber: fellow.mpesaNumber,
    mpesaName: fellow.mpesaName,
    createdAt: fellow.createdAt,
    droppedOut: fellow.droppedOut,
    droppedOutAt: fellow.droppedOutAt,
    idNumber: fellow.idNumber,
    gender: fellow.gender,
    dateOfBirth: fellow.dateOfBirth ?? null,
    supervisorId: fellow.supervisorId,
    supervisorName:
      supervisors.find((supervisor) => supervisor.id === fellow.supervisorId)
        ?.supervisorName ?? null,
    id: fellow.id,
    weeklyFellowRatings: fellow.weeklyFellowRatings,
    supervisors,
    sessions: fellow.groups.map((group) => ({
      schoolName: group.school?.schoolName,
      sessionType:
        group.school?.interventionSessions[0]?.sessionDate &&
        group.school?.interventionSessions[0]?.sessionDate > new Date()
          ? group.school?.interventionSessions[0]?.sessionType
          : "No upcoming session",
      groupName: group.groupName,
      numberOfStudents: group.students.length,
      students: group.students.map((student) => ({
        ...student,
        numClinicalCases: student.clinicalCases.length,
      })),
    })),
    attendances: fellow.fellowAttendances,
    groups: fellow.groups.map((group) => {
      return {
        ...group,
        attendances: fellow.fellowAttendances.filter((attendance) => {
          return attendance.groupId === group.id;
        }),
      };
    }),
    complaints: fellow.fellowComplaints,
    averageRating:
      Number(
        fellowAverageRatings.find((rating) => rating.id === fellow.id)
          ?.averageRating,
      ) ?? 0,
  }));
}

export async function submitWeeklyFellowRating(data: WeeklyFellowRatingSchema) {
  try {
    const supervisor = await currentSupervisor();

    if (!supervisor) {
      return {
        success: false,
        message: "User is not authorised",
      };
    }
    const parsedData = WeeklyFellowRatingSchema.parse(data);

    await db.weeklyFellowRatings.create({
      data: {
        ...parsedData,
        supervisorId: supervisor.id,
      },
    });

    revalidatePath("/sc/fellows");
    return {
      success: true,
      message: "successfully recorded fellow's weekly rating",
    };
  } catch (e) {
    console.error(e);
    return { success: false, message: "something went wrong" };
  }
}

export async function editWeeklyFellowRating(
  data: Omit<WeeklyFellowRatingSchema, "week"> & { id: string },
) {
  try {
    const supervisor = await currentSupervisor();

    if (!supervisor) {
      return {
        success: false,
        message: "User is not authorised",
      };
    }
    const result = await db.weeklyFellowRatings.update({
      where: {
        id: data.id,
        fellowId: data.fellowId,
      },
      data: {
        behaviourNotes: data.behaviourNotes,
        punctualityNotes: data.punctualityNotes,
        dressingAndGroomingNotes: data.dressingAndGroomingNotes,
        programDeliveryNotes: data.programDeliveryNotes,
        behaviourRating: data.behaviourRating,
        dressingAndGroomingRating: data.dressingAndGroomingRating,
        programDeliveryRating: data.programDeliveryRating,
        punctualityRating: data.punctualityRating,
      },
    });
    revalidatePath("/sc/fellows");
    return { success: true, data: result };
  } catch (e) {
    console.error(e);
    return {
      error: "Something went wrong during submission, please try again.",
    };
  }
}

export async function dropoutFellowWithReason(
  fellowId: Fellow["id"],
  dropoutReason: Fellow["dropOutReason"],
  revalidationPath: string,
  // replacementFellowId: Fellow["id"],
) {
  try {
    const supervisor = await currentSupervisor();

    if (!supervisor) {
      return {
        success: false,
        message: "User is not authorised",
      };
    }

    const schema = DropoutFellowSchema.pick({
      fellowId: true,
      dropoutReason: true,
    });

    const data = schema.parse({
      fellowId,
      dropoutReason /*, replacementFellowId*/,
    });

    const fellow = await db.fellow.update({
      where: { id: data.fellowId },
      data: {
        droppedOut: true, // for consistency w/ old data
        droppedOutAt: new Date(),
        dropOutReason: data.dropoutReason,
      },
    });

    // await db.interventionGroup.update({
    //   // @ts-ignore ignoring this since prisma expects a school id as well but we can't iterate over each school.
    //   where: {
    //     leaderId: fellowId as string,
    //   },
    //   data: {
    //     leaderId: replacementFellowId,
    //   },
    // });

    revalidatePath(revalidationPath);
    return {
      success: true,
      message: "Successfully dropped out the fellow",
      fellow,
    };
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error(error.message);
      return {
        error: error.message,
      };
    }
    console.error(error);
    return { error: "Something went wrong" };
  }
}

export async function markSessionOccurrence(
  data: z.infer<typeof MarkSessionOccurrenceSchema>,
) {
  try {
    const supervisor = await currentSupervisor();

    if (!supervisor) {
      return {
        success: false,
        message: "User is not authorised",
      };
    }

    const parsedData = MarkSessionOccurrenceSchema.parse(data);

    const session = await db.interventionSession.update({
      where: { id: parsedData.sessionId },
      data: {
        occurred: parsedData.occurrence === "attended",
      },
    });

    return {
      success: true,
      message: "Successfully updated session occurrence",
      data: session,
    };
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error(error.message);
      return {
        error: error.message,
      };
    }
    console.error(error);
    return { error: "Something went wrong" };
  }
}
