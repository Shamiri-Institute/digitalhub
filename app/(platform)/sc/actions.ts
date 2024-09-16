"use server";
import { currentSupervisor } from "#/app/auth";
import { objectId } from "#/lib/crypto";
import { db } from "#/lib/db";
import { generateFellowVisibleID } from "#/lib/utils";
import { revalidatePath } from "next/cache";
import {
  FellowSchema,
  SubmitComplaintSchema,
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
      fellowComplaints: true,
      fellowAttendances: true,
      weeklyFellowRatings: true,
      groups: {
        include: {
          students: true,
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
    weeklyFellowRatings: fellow.weeklyFellowRatings,
    fellowComplaints: fellow.fellowComplaints,
    sessions: fellow.groups.map((group) => ({
      schoolName: group.school?.schoolName,
      sessionType:
        group.school?.interventionSessions[0]?.sessionDate &&
        group.school?.interventionSessions[0]?.sessionDate > new Date()
          ? group.school?.interventionSessions[0]?.sessionType
          : "No upcoming session",
      groupName: group.groupName,
      numberOfStudents: group.students.length,
      students: group.students,
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

export async function submitFellowComplaint(
  complaintData: SubmitComplaintSchema,
) {
  try {
    const supervisor = await currentSupervisor();

    if (!supervisor) {
      return {
        success: false,
        message: "User is not authorised",
      };
    }

    const data = SubmitComplaintSchema.parse(complaintData);

    // migration required here
    await db.fellowComplaints.create({
      data: {
        ...data,
        supervisorId: supervisor.id,
        complaint: data.additionalComments ?? "",
      },
    });
    revalidatePath("/sc/fellows");
    return {
      success: true,
      message: "Successfully submitted fellow complaint",
    };
  } catch (e) {
    console.error(e);
    return {
      success: false,
      message: "Could not submit the fellow complaint",
    };
  }
}
