"use server";

import { currentHubCoordinator } from "#/app/auth";
import { db } from "#/lib/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  DropoutSchoolSchema,
  EditSchoolSchema,
  WeeklyHubReportSchema,
} from "../schemas";

/**
 * TODO: the functions here should also be cognizant of the project
 */

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

export async function revalidatePageAction(pathname: string) {
  revalidatePath(pathname);
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

export async function fetchSchoolDataCompletenessData(hubId: string) {
  // TODO: uncomment the school_sub_county query and adjust division from 6.0 -> 7.0
  const [schoolAttendanceData] = await db.$queryRaw<{ percentage: number }[]>`
    SELECT
      AVG((
        (CASE WHEN school_county IS NOT NULL THEN 1 ELSE 0 END)
        -- + (CASE WHEN school_sub_county is null THEN 1 ELSE 0 END)
        + (CASE WHEN school_type IS NOT NULL THEN 1 ELSE 0 END)
        + (CASE WHEN school_demographics IS NOT NULL THEN 1 ELSE 0 END)
        + (CASE WHEN boarding_day IS NOT NULL THEN 1 ELSE 0 END)
        + (CASE WHEN point_person_name IS NOT NULL THEN 1 ELSE 0 END)
        + (CASE WHEN point_person_phone IS NOT NULL THEN 1 ELSE 0 END)
      ) / 6.0 * 100) AS percentage
    FROM schools
    WHERE hub_id = ${hubId}
  `;

  if (!schoolAttendanceData) {
    return [];
  }

  const percentage = +Number(schoolAttendanceData.percentage).toFixed(2);

  return [
    { name: "actual", value: percentage },
    { name: "difference", value: 100 - percentage },
  ];
}

export type DropoutReasonsGraphData = {
  name: string;
  value: number;
};

export async function fetchDropoutReasons(hubId: string) {
  const dropoutData = await db.$queryRaw<DropoutReasonsGraphData[]>`
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

  dropoutData.forEach((data) => {
    data.value = Number(data.value);
  });

  return dropoutData;
}

export async function dropoutSchool(schoolId: string, dropoutReason: string) {
  try {
    const hubCoordinator = await currentHubCoordinator();

    if (!hubCoordinator) {
      throw new Error("The session has not been authenticated");
    }

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

export async function submitWeeklyHubReport(
  data: z.infer<typeof WeeklyHubReportSchema>,
) {
  try {
    const parsedData = WeeklyHubReportSchema.parse(data);

    await db.weeklyHubReport.create({
      data: parsedData,
    });

    // TODO:
    // this should revalidate the reports page
    return {
      success: true,
      message: "Successfully submitted the weekly report",
    };
  } catch (e) {
    console.error(e);
    return { success: false, message: "Something went wrong" };
  }
}

export type SessionRatingAverages = {
  session_type: "s0" | "s1" | "s2" | "s3" | "s4";
  student_behaviour: number;
  admin_support: number;
  workload: number;
};

export async function fetchSessionRatingAverages(hubId: string) {
  const ratingAverages = await db.$queryRaw<SessionRatingAverages[]>`
    SELECT
      ses.session_type AS session_type,
      AVG(isr.student_behavior_rating) AS student_behavior,
      AVG(isr.admin_support_rating) AS admin_support,
      AVG(isr.workload_rating) AS workload
    FROM intervention_session_ratings isr
    INNER JOIN supervisors AS sup ON isr.supervisor_id = sup.id
    INNER JOIN intervention_sessions AS ses ON isr.session_id = ses.id
    WHERE
      sup.hub_id = ${hubId}
    GROUP BY
      ses.session_type
    ORDER BY
      ses.session_type
  `;

  if (!ratingAverages.length) {
    return [];
  }

  // @ts-ignore
  ratingAverages.forEach((item) => {
    item.student_behaviour = Number(item.student_behaviour);
    item.admin_support = Number(item.admin_support);
    item.workload = Number(item.workload);
  });

  return ratingAverages;
}

export type SchoolAttendances = {
  session_type: string;
  count_attendance_marked: number;
  count_attendance_unmarked: number;
};

export async function fetchSchoolAttendances(hubId: string) {
  const [schoolCount] = await db.$queryRaw<{ count: number }[]>`
    SELECT
      COUNT(*) AS "count"
    FROM
      schools
    WHERE
      hub_id = ${hubId}
  `;

  const numSchools = Number(schoolCount?.count) ?? 0;

  const schoolAttendances = await db.$queryRaw<
    { count: number; session_type: string }[]
  >`
    SELECT
      session_type,
      count(distinct sa.school_id) AS "count"
    FROM
      student_attendances sa
    LEFT JOIN schools ON sa.school_id = schools.id
    LEFT JOIN intervention_sessions ON sa.session_id = intervention_sessions.id
    WHERE
      schools.hub_id = ${hubId}
    GROUP BY
      session_type
    ORDER BY
      session_type ASC`;

  return schoolAttendances.map<SchoolAttendances>(
    ({ session_type, count }) => ({
      session_type,
      count_attendance_marked: Number(count),
      count_attendance_unmarked: numSchools - Number(count),
    }),
  );
}

export async function editSchoolInformation(
  schoolId: string,
  schoolInfo: z.infer<typeof EditSchoolSchema>,
) {
  try {
    const authedCoordinator = await currentHubCoordinator();

    if (!authedCoordinator) {
      throw new Error("User not authorised to perform this function");
    }

    const parsedData = EditSchoolSchema.parse(schoolInfo);

    const { schoolName } = await db.school.update({
      where: {
        id: schoolId,
      },
      data: parsedData,
    });

    revalidatePath("/hc/schools");
    return {
      success: true,
      message: `Successfully updated school information for ${schoolName}`,
    };
  } catch (err) {
    console.error(err);
    return {
      success: false,
      message:
        (err as Error)?.message ?? "Sorry, could not update the school details",
    };
  }
}
