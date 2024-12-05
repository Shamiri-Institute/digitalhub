"use server";

import { currentHubCoordinator, getCurrentUser } from "#/app/auth";
import { db } from "#/lib/db";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  AssignPointSupervisorSchema,
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
      interventionSessions: {
        include: {
          sessionRatings: true,
        },
      },
      students: {
        include: {
          assignedGroup: true,
          _count: {
            select: {
              clinicalCases: true,
            },
          },
        },
      },
    },
  });
}

export async function revalidatePageAction(
  pathname: string,
  mode?: "layout" | "page",
) {
  revalidatePath(pathname, mode);
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
    val.session_number = Math.round(val.session_number);
    val.count = Math.round(val.count);
  });

  return sessionAttendanceData;
}

export async function fetchSchoolDataCompletenessData(
  hubId: string,
  schoolId?: string,
) {
  // TODO: uncomment the school_sub_county query and adjust division from 6.0 -> 7.0
  const [schoolAttendanceData] = await db.$queryRaw<{ percentage: number }[]>`
    SELECT
      ${
        schoolId
          ? Prisma.sql`(
            (CASE WHEN school_county IS NOT NULL THEN 1 ELSE 0 END)
            -- + (CASE WHEN school_sub_county is null THEN 1 ELSE 0 END)
            + (CASE WHEN school_type IS NOT NULL THEN 1 ELSE 0 END)
            + (CASE WHEN school_demographics IS NOT NULL THEN 1 ELSE 0 END)
            + (CASE WHEN boarding_day IS NOT NULL THEN 1 ELSE 0 END)
            + (CASE WHEN point_person_name IS NOT NULL THEN 1 ELSE 0 END)
            + (CASE WHEN point_person_phone IS NOT NULL THEN 1 ELSE 0 END)
          ) / 6.0 * 100`
          : Prisma.sql`AVG(
            (CASE WHEN school_county IS NOT NULL THEN 1 ELSE 0 END)
            -- + (CASE WHEN school_sub_county is null THEN 1 ELSE 0 END)
            + (CASE WHEN school_type IS NOT NULL THEN 1 ELSE 0 END)
            + (CASE WHEN school_demographics IS NOT NULL THEN 1 ELSE 0 END)
            + (CASE WHEN boarding_day IS NOT NULL THEN 1 ELSE 0 END)
            + (CASE WHEN point_person_name IS NOT NULL THEN 1 ELSE 0 END)
            + (CASE WHEN point_person_phone IS NOT NULL THEN 1 ELSE 0 END)
          ) / 6.0 * 100`
      } AS percentage
    FROM schools
    WHERE hub_id = ${hubId}
      ${schoolId ? Prisma.sql`AND id = ${schoolId}` : Prisma.sql``}
  `;

  if (!schoolAttendanceData) {
    return [];
  }

  const percentage = +Math.round(schoolAttendanceData.percentage);

  return [
    { name: "actual", value: Math.round(percentage) },
    { name: "difference", value: 100 - Math.round(percentage) },
  ];
}

export type DropoutReasonsGraphData = {
  name: string;
  value: number;
};

export async function fetchDropoutReasons(hubId: string, schoolId?: string) {
  const dropoutData = await db.$queryRaw<DropoutReasonsGraphData[]>`
    SELECT
      COUNT(*) AS value,
      dropout_reason AS name
    FROM schools
    WHERE
      dropout_reason IS NOT NULL
      AND dropped_out = true
      AND hub_id = ${hubId}
      ${schoolId ? Prisma.sql`AND id = ${schoolId}` : Prisma.sql``}
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
    const user = await getCurrentUser();

    if (!hubCoordinator || !user) {
      throw new Error("The session has not been authenticated");
    }

    const data = DropoutSchoolSchema.parse({ schoolId, dropoutReason });
    const result = await db.school.update({
      data: {
        dropoutReason: data.dropoutReason,
        droppedOut: true,
        droppedOutAt: new Date(),
        schoolDropoutHistory: {
          create: [
            {
              dropoutReason: data.dropoutReason,
              droppedOut: true,
              userId: user.user.id,
            },
          ],
        },
      },
      where: {
        id: data.schoolId,
      },
      include: {
        schoolDropoutHistory: true,
      },
    });

    revalidatePath("/hc/schools");

    return {
      success: true,
      message: result.schoolName + " successfully dropped out.",
      data: result,
    };
  } catch (e) {
    console.error(e);
    return {
      success: false,
      message: "Something went wrong while trying to drop out the school",
    };
  }
}

export async function undoDropoutSchool(schoolId: string) {
  try {
    const hubCoordinator = await currentHubCoordinator();
    const user = await getCurrentUser();

    if (!hubCoordinator || !user) {
      throw new Error("The session has not been authenticated");
    }

    const result = await db.school.update({
      data: {
        dropoutReason: null,
        droppedOut: false,
        droppedOutAt: null,
        schoolDropoutHistory: {
          create: [
            {
              dropoutReason: null,
              droppedOut: false,
              userId: user.user.id,
            },
          ],
        },
      },
      where: {
        id: schoolId,
      },
      include: {
        schoolDropoutHistory: true,
      },
    });

    revalidatePath("/hc/schools");

    return {
      success: true,
      message: result.schoolName + " status set to active",
      data: result,
    };
  } catch (e) {
    console.error(e);
    return {
      success: false,
      message:
        "Something went wrong while trying to update school drop out status",
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

export async function fetchSessionRatingAverages(
  hubId: string,
  schoolId?: string,
) {
  const ratingAverages = await db.$queryRaw<SessionRatingAverages[]>`
    ${
      schoolId
        ? Prisma.sql`
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
          AND ses.school_id = ${schoolId}
        GROUP BY
          ses.session_type
        ORDER BY
          ses.session_type
      `
        : Prisma.sql`
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
      `
    }
  `;

  if (!ratingAverages.length) {
    return [];
  }

  // @ts-ignore
  ratingAverages.forEach((item) => {
    item.student_behaviour = Math.round(item.student_behaviour) || 0;
    item.admin_support = Math.round(item.admin_support) || 0;
    item.workload = Math.round(item.workload) || 0;
  });

  return ratingAverages;
}

export type SchoolAttendances = {
  session_type: string;
  count_attendance_marked: number;
  count_attendance_unmarked: number;
};

export async function fetchSchoolAttendances(hubId: string, schoolId?: string) {
  const [schoolCount] = await db.$queryRaw<{ count: number }[]>`
    SELECT
      COUNT(*) AS "count"
    FROM
      schools
    WHERE
      hub_id = ${hubId}
      ${schoolId ? Prisma.sql`AND id = ${schoolId}` : Prisma.sql``}
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
      ${schoolId ? Prisma.sql`AND schools.id = ${schoolId}` : Prisma.sql``}
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

export async function fetchHubSupervisors({
  where,
}: {
  where: Prisma.SupervisorWhereInput;
}) {
  return await db.supervisor.findMany({
    where,
  });
}

export async function assignSchoolPointSupervisor(
  schoolId: string,
  schoolInfo: z.infer<typeof AssignPointSupervisorSchema>,
) {
  try {
    const authedCoordinator = await currentHubCoordinator();

    if (!authedCoordinator) {
      throw new Error("User not authorised to perform this function");
    }

    const parsedData = AssignPointSupervisorSchema.parse(schoolInfo);

    const { schoolName } = await db.school.update({
      where: {
        id: schoolId,
      },
      data: parsedData,
    });
    return {
      success: true,
      message: `Successfully updated point supervisor for ${schoolName}`,
    };
  } catch (err) {
    console.error(err);
    return {
      success: false,
      message:
        (err as Error)?.message ??
        "Sorry, could not assign the school point supervisor",
    };
  }
}
