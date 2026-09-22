"use server";

import { format } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";
import { eq, sql } from "drizzle-orm";
import { signOut } from "next-auth/react";
import { revalidatePath } from "next/cache";
import type { z } from "zod";

import { currentHubCoordinator } from "#/app/auth";
import { db } from "#/db/client";
import { sessionTypes } from "#/db/enums";
import {
  interventionGroup,
  interventionSession,
  school,
  schoolDropoutHistory,
  weeklyHubReport,
} from "#/db/schema";
import { objectId } from "#/lib/crypto";
import { getSchoolInitials } from "#/lib/utils";
import {
  AddSchoolSchema,
  AssignPointSupervisorSchema,
  DropoutSchoolSchema,
  EditSchoolSchema,
  WeeklyHubReportSchema,
} from "../schemas";

/**
 * TODO: the functions here should also be cognizant of the project
 */

type SchoolWithRelations = Omit<
  Awaited<ReturnType<typeof fetchSchoolData>>[number],
  "interventionGroups"
>;

type AddSchoolResponse = {
  success: boolean;
  message: string;
  data?: SchoolWithRelations;
};

/** Count of clinical cases per student for the shared tables. */
const clinicalCasesCount = (st: { id: unknown }) =>
  sql<number>`(select count(*)::int from (select student_id from clinical_screening_info) c where c.student_id = ${st.id})`.as(
    "clinical_cases_count",
  );

export async function fetchSchoolData(hubId: string) {
  const schools = await db.query.school.findMany({
    where: (s, { eq }) => eq(s.hubId, hubId),
    with: {
      assignedSupervisor: true,
      interventionSessions: { with: { sessionRatings: true, session: true } },
      interventionGroups: { with: { leader: true } },
      students: {
        with: { assignedGroup: true },
        extras: (st) => ({ clinicalCasesCount: clinicalCasesCount(st) }),
      },
    },
  });
  return schools;
}

export async function revalidatePageAction(pathname: string, mode?: "layout" | "page") {
  revalidatePath(pathname, mode);
}

export async function fetchSchoolDataCompletenessData(hubId: string, schoolId?: string) {
  // TODO: uncomment the school_sub_county query and adjust division from 6.0 -> 7.0
  const {
    rows: [schoolAttendanceData],
  } = await db.execute<{
    percentage: number | string | null;
  }>(sql`
    SELECT
      ${
        schoolId
          ? sql`(
            (CASE WHEN school_county IS NOT NULL THEN 1 ELSE 0 END)
            -- + (CASE WHEN school_sub_county is null THEN 1 ELSE 0 END)
            + (CASE WHEN school_type IS NOT NULL THEN 1 ELSE 0 END)
            + (CASE WHEN school_demographics IS NOT NULL THEN 1 ELSE 0 END)
            + (CASE WHEN boarding_day IS NOT NULL THEN 1 ELSE 0 END)
            + (CASE WHEN point_person_name IS NOT NULL THEN 1 ELSE 0 END)
            + (CASE WHEN point_person_phone IS NOT NULL THEN 1 ELSE 0 END)
          ) / 6.0 * 100`
          : sql`AVG(
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
      ${schoolId ? sql`AND id = ${schoolId}` : sql.empty()}
  `);

  if (!schoolAttendanceData) {
    return [];
  }

  const percentage = Math.round(Number(schoolAttendanceData.percentage));

  return [
    { name: "actual", value: percentage },
    { name: "difference", value: 100 - percentage },
  ];
}

export type DropoutReasonsGraphData = {
  name: string;
  value: number;
};

export async function fetchDropoutReasons(hubId: string, schoolId?: string) {
  const { rows: dropoutData } = await db.execute<{
    name: string;
    value: number | string | null;
  }>(sql`
    SELECT
      COUNT(*)::int AS value,
      dropout_reason AS name
    FROM schools
    WHERE
      dropout_reason IS NOT NULL
      AND dropped_out = true
      AND hub_id = ${hubId}
      ${schoolId ? sql`AND id = ${schoolId}` : sql.empty()}
    GROUP BY
      dropout_reason
  `);

  const mapped: Array<{ name: string; value: number }> = dropoutData.map((data) => ({
    name: data.name,
    value: Number(data.value),
  }));

  return mapped;
}

/** Updates the school and records the change; returns the school with its dropout history. */
function setSchoolDropout(
  schoolId: string,
  data: { dropoutReason: string | null; droppedOut: boolean; droppedOutAt: Date | null },
  userId: string,
) {
  return db.transaction(async (tx) => {
    const [updated] = await tx.update(school).set(data).where(eq(school.id, schoolId)).returning();
    if (!updated) {
      throw new Error(`School ${schoolId} not found`);
    }
    await tx.insert(schoolDropoutHistory).values({
      schoolId,
      dropoutReason: data.dropoutReason,
      droppedOut: data.droppedOut,
      userId,
    });
    const history = await tx.query.schoolDropoutHistory.findMany({
      where: (h, { eq }) => eq(h.schoolId, schoolId),
    });
    return { ...updated, schoolDropoutHistory: history };
  });
}

export async function dropoutSchool(schoolId: string, dropoutReason: string) {
  try {
    const hubCoordinator = await currentHubCoordinator();

    if (!hubCoordinator?.profile || !hubCoordinator.session?.user.id) {
      throw new Error("The session has not been authenticated");
    }

    const userId = hubCoordinator.session.user.id;

    const data = DropoutSchoolSchema.parse({ schoolId, dropoutReason });
    const result = await setSchoolDropout(
      data.schoolId,
      { dropoutReason: data.dropoutReason, droppedOut: true, droppedOutAt: new Date() },
      userId,
    );

    revalidatePath("/hc/schools");

    return {
      success: true,
      message: `${result.schoolName} successfully dropped out.`,
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

    if (!hubCoordinator) {
      throw new Error("The session has not been authenticated");
    }

    const result = await setSchoolDropout(
      schoolId,
      { dropoutReason: null, droppedOut: false, droppedOutAt: null },
      hubCoordinator.session.user.id as string,
    );

    revalidatePath("/hc/schools");

    return {
      success: true,
      message: `${result.schoolName} status set to active`,
      data: result,
    };
  } catch (e) {
    console.error(e);
    return {
      success: false,
      message: "Something went wrong while trying to update school drop out status",
    };
  }
}

export async function submitWeeklyHubReport(data: z.infer<typeof WeeklyHubReportSchema>) {
  try {
    const parsedData = WeeklyHubReportSchema.parse(data);

    await db.insert(weeklyHubReport).values(parsedData);

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
  student_behavior: number | string | null;
  admin_support: number | string | null;
  workload: number | string | null;
};

export async function fetchSessionRatingAverages(hubId: string, schoolId?: string) {
  const { rows: ratingAverages } = await db.execute<{
    session_type: "s0" | "s1" | "s2" | "s3" | "s4";
    student_behavior: number | string | null;
    admin_support: number | string | null;
    workload: number | string | null;
  }>(sql`
    ${
      schoolId
        ? sql`
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
        : sql`
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
  `);

  if (!ratingAverages.length) {
    return [];
  }

  const mapped: SessionRatingAverages[] = ratingAverages.map((item) => ({
    session_type: item.session_type,
    student_behavior: Math.round(Number(item.student_behavior)) || 0,
    admin_support: Math.round(Number(item.admin_support)) || 0,
    workload: Math.round(Number(item.workload)) || 0,
  }));

  return mapped;
}

export type SchoolAttendances = {
  session_type: string;
  count_attendance_marked: number;
  count_attendance_unmarked: number;
};

export async function fetchSchoolAttendances(hubId: string, schoolId?: string) {
  const {
    rows: [schoolCount],
  } = await db.execute<{
    count: number | string | null;
  }>(sql`
    SELECT
      COUNT(*)::int AS "count"
    FROM
      schools
    WHERE
      hub_id = ${hubId}
      ${schoolId ? sql`AND id = ${schoolId}` : sql.empty()}
  `);

  const numSchools = Number(schoolCount?.count ?? 0);

  const { rows: schoolAttendances } = await db.execute<{
    count: number | string | null;
    session_type: string;
  }>(sql`
    SELECT
      session_type,
      count(distinct sa.school_id)::int AS "count"
    FROM
      student_attendances sa
    LEFT JOIN schools ON sa.school_id = schools.id
    LEFT JOIN intervention_sessions ON sa.session_id = intervention_sessions.id
    WHERE
      schools.hub_id = ${hubId}
      ${schoolId ? sql`AND schools.id = ${schoolId}` : sql.empty()}
    GROUP BY
      session_type
    ORDER BY
      session_type ASC`);

  return schoolAttendances.map<{
    session_type: string;
    count_attendance_marked: number;
    count_attendance_unmarked: number;
  }>(({ session_type, count }) => ({
    session_type,
    count_attendance_marked: Number(count),
    count_attendance_unmarked: numSchools - Number(count),
  }));
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

    const [updated] = await db
      .update(school)
      .set({
        schoolName: parsedData.schoolName ?? null,
        numbersExpected: parsedData.numbersExpected ?? null,
        schoolType: parsedData.schoolType ?? null,
        schoolEmail: parsedData.schoolEmail ?? null,
        schoolCounty: parsedData.schoolCounty ?? null,
        schoolSubCounty: parsedData.schoolSubCounty ?? null,
        schoolDemographics: parsedData.schoolDemographics ?? null,
        pointPersonName: parsedData.pointPersonName ?? null,
        pointPersonPhone: parsedData.pointPersonPhone ?? null,
        pointPersonEmail: parsedData.pointPersonEmail ?? null,
        principalName: parsedData.principalName ?? null,
        principalPhone: parsedData.principalPhone ?? null,
        boardingDay: parsedData.boardingDay ?? null,
        droppedOut: false,
        dropoutReason: null,
        droppedOutAt: null,
      })
      .where(eq(school.id, schoolId))
      .returning({ schoolName: school.schoolName });
    if (!updated) {
      throw new Error(`School ${schoolId} not found`);
    }
    return {
      success: true,
      message: `Successfully updated school information for ${updated.schoolName}`,
    };
  } catch (err) {
    console.error(err);
    return {
      success: false,
      message: (err as Error)?.message ?? "Sorry, could not update the school details",
    };
  }
}

/** Supervisors of a hub. */
export async function fetchHubSupervisors({ hubId }: { hubId: string }) {
  return db.query.supervisor.findMany({
    where: (s, { eq }) => eq(s.hubId, hubId),
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

    const [updated] = await db
      .update(school)
      .set(parsedData)
      .where(eq(school.id, schoolId))
      .returning({ schoolName: school.schoolName });
    if (!updated) {
      throw new Error(`School ${schoolId} not found`);
    }
    return {
      success: true,
      message: `Successfully updated point supervisor for ${updated.schoolName}`,
    };
  } catch (err) {
    console.error(err);
    return {
      success: false,
      message: (err as Error)?.message ?? "Sorry, could not assign the school point supervisor",
    };
  }
}

export async function addSchool(data: z.infer<typeof AddSchoolSchema>): Promise<AddSchoolResponse> {
  try {
    const hubCoordinator = await currentHubCoordinator();
    if (!hubCoordinator) {
      throw new Error("User not authorized to perform this function");
    }

    const hubId = hubCoordinator.profile?.assignedHubId;
    if (!hubId) {
      await signOut({ callbackUrl: "/login" });
      throw new Error("Unauthorised user");
    }
    const parsedData = AddSchoolSchema.parse(data);

    // Get available fellows for the pre-session date
    const fellows = await db.query.fellow.findMany({
      where: (f, { eq }) => eq(f.hubId, hubId),
      with: { groups: { columns: { id: true, schoolId: true } } },
    });

    // Session dates per school, loaded once instead of per group row.
    const groupSchoolIds = [...new Set(fellows.flatMap((f) => f.groups.map((g) => g.schoolId)))];
    const sessionDates =
      groupSchoolIds.length === 0
        ? []
        : await db.query.interventionSession.findMany({
            where: (s, { inArray }) => inArray(s.schoolId, groupSchoolIds),
            columns: { schoolId: true, sessionDate: true },
          });
    const sessionDatesBySchool = new Map<string, Set<string>>();
    for (const { schoolId, sessionDate } of sessionDates) {
      if (!schoolId) continue;
      const dateStr = format(toZonedTime(sessionDate, "Africa/Nairobi"), "yyyy-MM-dd");
      const dates = sessionDatesBySchool.get(schoolId) ?? new Set<string>();
      dates.add(dateStr);
      sessionDatesBySchool.set(schoolId, dates);
    }

    // Create a map of fellows and their session dates
    const fellowSessionDates = new Map<string, Set<string>>();
    fellows.forEach((fellow) => {
      const dates = new Set<string>();
      fellow.groups.forEach((group) => {
        for (const dateStr of sessionDatesBySchool.get(group.schoolId) ?? []) {
          dates.add(dateStr);
        }
      });
      fellowSessionDates.set(fellow.id, dates);
    });

    const availableFellows = fellows.filter((fellow) => {
      const fellowDates = fellowSessionDates.get(fellow.id);
      return !fellowDates?.has(
        format(toZonedTime(parsedData.preSessionDate, "Africa/Nairobi"), "yyyy-MM-dd"),
      );
    });

    // Sort fellows by number of assigned groups (ascending)
    availableFellows.sort((a, b) => a.groups.length - b.groups.length);

    if (availableFellows.length === 0) {
      return {
        success: false,
        message: "No available fellows for the pre-session date",
      };
    }

    return await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(school)
        .values({
          id: objectId("sch"),
          visibleId: objectId("sch"),
          schoolName: parsedData.schoolName,
          schoolType: parsedData.schoolType,
          schoolEmail: parsedData.schoolEmail,
          schoolCounty: parsedData.schoolCounty,
          schoolSubCounty: parsedData.schoolSubCounty,
          schoolDemographics: parsedData.schoolDemographics,
          pointPersonName: parsedData.pointPersonName,
          pointPersonPhone: parsedData.pointPersonPhone,
          pointPersonEmail: parsedData.pointPersonEmail,
          numbersExpected: parsedData.numbersExpected,
          principalName: parsedData.principalName,
          principalPhone: parsedData.principalPhone,
          boardingDay: parsedData.boardingDay,
          droppedOut: false,
          dropoutReason: null,
          droppedOutAt: null,
          hubId,
        })
        .returning();
      if (!created) {
        throw new Error("Could not create the school");
      }
      // A school created in this transaction has no supervisor, sessions or students yet.
      const newSchool: SchoolWithRelations = {
        ...created,
        assignedSupervisor: null,
        interventionSessions: [],
        students: [],
      };

      const numGroups = Math.ceil((parsedData.numbersExpected || 1000) / 16);

      // Get the first word of the school name for the prefix
      const schoolNamePrefix = getSchoolInitials(newSchool.schoolName) ?? "GROUP";

      const interventionGroups: (typeof interventionGroup.$inferInsert)[] = [];
      for (let i = 0; i < numGroups; i++) {
        // Get the fellow with the least number of groups
        const leader = availableFellows[i];
        if (!leader) break;

        interventionGroups.push({
          id: objectId("group"),
          groupName: `${schoolNamePrefix} ${i + 1}`,
          schoolId: newSchool.id,
          leaderId: leader.id,
          projectId: hubCoordinator.profile?.assignedHub?.projectId ?? "",
        });
      }

      if (interventionGroups.length > 0) {
        await tx.insert(interventionGroup).values(interventionGroups);
      }

      // Create intervention sessions
      const assignedHubId = hubCoordinator.profile?.assignedHubId ?? undefined;
      const sessionNames = await tx.query.sessionName.findMany({
        where: (n, { and, eq }) =>
          and(
            assignedHubId ? eq(n.hubId, assignedHubId) : undefined,
            eq(n.sessionType, sessionTypes.INTERVENTION),
          ),
      });

      const interventionSessions: (typeof interventionSession.$inferInsert)[] = [];

      const currentDate = toZonedTime(parsedData.preSessionDate, "Africa/Nairobi");
      currentDate.setHours(16, 0, 0, 0); // Set to 4 PM Nairobi time

      for (const sessionName of sessionNames) {
        interventionSessions.push({
          id: objectId("session"),
          sessionDate: fromZonedTime(currentDate, "Africa/Nairobi"),
          status: "Scheduled",
          sessionType: sessionName.sessionName,
          sessionId: sessionName.id,
          schoolId: newSchool.id,
          occurred: false,
          yearOfImplementation: new Date().getFullYear(),
          projectId: hubCoordinator.profile?.assignedHub?.projectId || undefined,
          hubId,
        });

        // Move to next week for next session
        currentDate.setDate(currentDate.getDate() + 7);
      }

      if (interventionSessions.length > 0) {
        await tx.insert(interventionSession).values(interventionSessions);
      }

      return {
        success: true,
        message: "School added successfully",
        data: newSchool,
      };
    });
  } catch (error) {
    console.error("Error adding school:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to add school",
    };
  }
}
