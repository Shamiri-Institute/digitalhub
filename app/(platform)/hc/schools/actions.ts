"use server";

import { db } from "#/lib/db";
import { revalidatePath } from "next/cache";
import { DropoutSchoolSchema } from "../schemas";
import { currentHubCoordinator } from "#/app/auth";

export async function fetchSchoolData(hubId: string) {
  return await db.school.findMany({
    where: {
      hubId,
    },
    include: {
      assignedSupervisor: true,
    },
  });
}

export async function fetchSessionAttendanceData(hubId: string) {
  const sessionAttendanceData = await db.$queryRaw<
    { session_number: number; count: number }[]
  >`
    SELECT
      fa.session_number AS session_number,
      COUNT(DISTINCT fa.school_id) AS count
    FROM
      fellow_attendances fa
    LEFT JOIN schools ON fa.school_id = schools.id
    LEFT JOIN hubs ON schools.hub_id = hubs.id AND hubs.id = ${hubId}
    GROUP BY
      fa.session_number
    ORDER BY
      fa.session_number ASC
  `;

  sessionAttendanceData.map((val) => {
    val.session_number = Number(val.session_number);
    val.count = Number(val.count);
  });

  return sessionAttendanceData;
}

export async function fetchDropoutReasons(hubId: string) {
  const dropoutData = await db.$queryRaw<{ name: string; value: number }[]>`
    SELECT
      COUNT(*) AS value,
      dropout_reason AS name
    FROM schools
    WHERE
      dropout_reason IS NOT NULL
      AND hub_id = ${hubId}
    GROUP BY
      dropout_reason
  `;

  // necessary loop since prisma returns bigints as the default numeric type 😩
  dropoutData.forEach((data) => {
    data.value = Number(data.value);
  });

  return dropoutData;
}

export async function dropoutSchool(schoolId: string, dropoutReason: string) {
  const hubCoordinator = await currentHubCoordinator();

  try {
    const data = DropoutSchoolSchema.parse({ schoolId, dropoutReason });
    await db.school.update({
      data: {
        dropoutReason: data.dropoutReason,
        droppedOut: true,
        droppedOutAt: new Date(),
      },
      where: {
        id: data.schoolId,
      },
    });

    revalidatePath("/hc/schools");

    return {
      success: true,
      message: "Successfully dropped out school",
    };
  } catch (e) {
    console.error(e);
    return {
      success: false,
      message: "Something went wrong while trying to drop out the school",
    };
  }
}
