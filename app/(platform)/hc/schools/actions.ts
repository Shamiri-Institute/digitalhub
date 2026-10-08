"use server";

import { format } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";
import { eq, sql } from "drizzle-orm";
import { signOut } from "next-auth/react";
import { refresh, revalidatePath } from "next/cache";
import type { z } from "zod";

import { currentHubCoordinator } from "#/app/auth";
import { db } from "#/db/client";
import { countOf } from "#/db/sql";
import { ImplementerRole, sessionTypes } from "#/db/enums";
import {
  interventionGroup,
  interventionSession,
  interventionSessionRating,
  school,
  schoolDropoutHistory,
  weeklyHubReport,
} from "#/db/schema";
import { requireHubRole, requireSchoolInHub } from "#/lib/auth/require-hub-role";
import { objectId } from "#/lib/crypto";
import { getSchoolInitials } from "#/lib/utils";
import {
  AddSchoolSchema,
  AssignPointSupervisorSchema,
  DropoutSchoolSchema,
  EditSchoolSchema,
  WeeklyHubReportSchema,
} from "../schemas";

/** The schools of the caller's hub. Supervisors and hub coordinators both list them. */
export async function fetchSchoolData() {
  const { hubId: callerHubId } = await requireHubRole(
    ImplementerRole.SUPERVISOR,
    ImplementerRole.HUB_COORDINATOR,
  );
  return db.query.school.findMany({
    where: (s, { eq }) => eq(s.hubId, callerHubId),
    columns: {
      id: true,
      visibleId: true,
      createdAt: true,
      archivedAt: true,
      schoolName: true,
      schoolType: true,
      schoolEmail: true,
      schoolCounty: true,
      schoolSubCounty: true,
      schoolDemographics: true,
      boardingDay: true,
      numbersExpected: true,
      pointPersonName: true,
      pointPersonPhone: true,
      pointPersonEmail: true,
      principalName: true,
      principalPhone: true,
      assignedSupervisorId: true,
      droppedOut: true,
      droppedOutAt: true,
    },
    with: {
      assignedSupervisor: {
        columns: { supervisorName: true, cellNumber: true, supervisorEmail: true },
      },
      interventionSessions: {
        columns: { sessionDate: true, occurred: true, sessionType: true },
        with: { session: { columns: { sessionName: true } } },
        extras: (session) => ({
          sessionRatingsCount: countOf(interventionSessionRating.sessionId, session.id).as(
            "session_ratings_count",
          ),
        }),
      },
    },
    orderBy: (s, { asc }) => asc(s.schoolName),
  });
}

export async function fetchSchoolDataCompletenessData(schoolId?: string) {
  const coordinatorHubId = await requireCoordinatorHub();
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
    WHERE hub_id = ${coordinatorHubId}
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

export async function fetchDropoutReasons(schoolId?: string) {
  const coordinatorHubId = await requireCoordinatorHub();
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
      AND hub_id = ${coordinatorHubId}
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

/** The signed-in hub coordinator's hub. The reads below never take a hub id from the client. */
async function requireCoordinatorHub() {
  const { hubId: coordinatorHubId } = await requireHubRole(ImplementerRole.HUB_COORDINATOR);
  return coordinatorHubId;
}

/** The coordinator's user id and hub id, after checking the school is in that hub. */
async function requireSchoolInCoordinatorHub(schoolId: string) {
  const coordinator = await requireHubRole(ImplementerRole.HUB_COORDINATOR);
  await requireSchoolInHub(schoolId, coordinator.hubId);
  return coordinator;
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
    const data = DropoutSchoolSchema.parse({ schoolId, dropoutReason });
    const { userId } = await requireSchoolInCoordinatorHub(data.schoolId);
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
    const { userId } = await requireSchoolInCoordinatorHub(schoolId);

    const result = await setSchoolDropout(
      schoolId,
      { dropoutReason: null, droppedOut: false, droppedOutAt: null },
      userId,
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
    // The hub and the author come from the session, never from the request.
    const coordinator = await requireHubRole(ImplementerRole.HUB_COORDINATOR);
    const parsedData = WeeklyHubReportSchema.parse(data);

    await db
      .insert(weeklyHubReport)
      .values({ ...parsedData, hubId: coordinator.hubId, submittedBy: coordinator.profileId });

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

export async function fetchSessionRatingAverages(schoolId?: string) {
  const coordinatorHubId = await requireCoordinatorHub();
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
          sup.hub_id = ${coordinatorHubId}
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
          sup.hub_id = ${coordinatorHubId}
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

export async function fetchSchoolAttendances(schoolId?: string) {
  const coordinatorHubId = await requireCoordinatorHub();
  const [
    {
      rows: [schoolCount],
    },
    { rows: schoolAttendances },
  ] = await Promise.all([
    db.execute<{
      count: number | string | null;
    }>(sql`
    SELECT
      COUNT(*)::int AS "count"
    FROM
      schools
    WHERE
      hub_id = ${coordinatorHubId}
      ${schoolId ? sql`AND id = ${schoolId}` : sql.empty()}
  `),
    db.execute<{
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
      schools.hub_id = ${coordinatorHubId}
      ${schoolId ? sql`AND schools.id = ${schoolId}` : sql.empty()}
    GROUP BY
      session_type
    ORDER BY
      session_type ASC`),
  ]);

  const numSchools = Number(schoolCount?.count ?? 0);

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
    const parsedData = EditSchoolSchema.parse(schoolInfo);
    await requireSchoolInCoordinatorHub(schoolId);

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
    refresh();
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

/** The supervisors of the caller's hub. Supervisors and hub coordinators both list them. */
export async function fetchHubSupervisors() {
  const { hubId: callerHubId } = await requireHubRole(
    ImplementerRole.SUPERVISOR,
    ImplementerRole.HUB_COORDINATOR,
  );
  return db.query.supervisor.findMany({
    where: (s, { eq }) => eq(s.hubId, callerHubId),
    orderBy: (s, { asc }) => asc(s.supervisorName),
  });
}

export async function assignSchoolPointSupervisor(
  schoolId: string,
  schoolInfo: z.infer<typeof AssignPointSupervisorSchema>,
) {
  try {
    const parsedData = AssignPointSupervisorSchema.parse(schoolInfo);
    // Both the school and the new point supervisor must be in the coordinator's hub.
    const { hubId: coordinatorHubId } = await requireSchoolInCoordinatorHub(schoolId);
    const supervisorInCoordinatorHub = await db.query.supervisor.findFirst({
      where: (s, { and, eq }) =>
        and(eq(s.id, parsedData.assignedSupervisorId), eq(s.hubId, coordinatorHubId)),
      columns: { id: true },
    });
    if (!supervisorInCoordinatorHub) {
      throw new Error("Supervisor not found");
    }

    const [updated] = await db
      .update(school)
      .set(parsedData)
      .where(eq(school.id, schoolId))
      .returning({ schoolName: school.schoolName });
    if (!updated) {
      throw new Error(`School ${schoolId} not found`);
    }
    refresh();
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

export async function addSchool(data: z.infer<typeof AddSchoolSchema>) {
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

    const fellows = await db.query.fellow.findMany({
      where: (f, { eq }) => eq(f.hubId, hubId),
      with: { groups: { columns: { id: true, schoolId: true } } },
    });

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

    availableFellows.sort((a, b) => a.groups.length - b.groups.length);

    if (availableFellows.length === 0) {
      return {
        success: false,
        message: "No available fellows for the pre-session date",
      };
    }

    const result = await db.transaction(async (tx) => {
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

      const numGroups = Math.ceil((parsedData.numbersExpected || 1000) / 16);

      const schoolNamePrefix = getSchoolInitials(created.schoolName) ?? "GROUP";

      const interventionGroups: (typeof interventionGroup.$inferInsert)[] = [];
      for (let i = 0; i < numGroups; i++) {
        // Get the fellow with the least number of groups
        const leader = availableFellows[i];
        if (!leader) break;

        interventionGroups.push({
          id: objectId("group"),
          groupName: `${schoolNamePrefix} ${i + 1}`,
          schoolId: created.id,
          leaderId: leader.id,
          projectId: hubCoordinator.profile?.assignedHub?.projectId ?? "",
        });
      }

      if (interventionGroups.length > 0) {
        await tx.insert(interventionGroup).values(interventionGroups);
      }

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
          schoolId: created.id,
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
      };
    });
    refresh();
    return result;
  } catch (error) {
    console.error("Error adding school:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to add school",
    };
  }
}
