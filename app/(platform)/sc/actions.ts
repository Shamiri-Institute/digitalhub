"use server";
import { currentSupervisor } from "#/app/auth";
import { objectId } from "#/lib/crypto";
import { db } from "#/lib/db";
import { generateFellowVisibleID } from "#/lib/utils";
import { Fellow } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  DropoutFellowSchema,
  FellowSchema,
  MarkSessionOccurrenceSchema,
  WeeklyFellowRatingSchema,
} from "./schemas";

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
      weeklyFellowRatings: true,
      groups: {
        include: {
          students: {
            include: {
              clinicalCases: true,
            },
          },
          school: {
            include: {
              interventionSessions: {
                orderBy: {
                  sessionDate: "asc",
                },
              },
            },
          },
        },
      },
    },
  });

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
