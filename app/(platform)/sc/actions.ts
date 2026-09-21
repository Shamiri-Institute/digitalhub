"use server";
import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { currentSupervisor, currentSupervisorLite } from "#/app/auth";
import { db, queryRaw } from "#/db/client";
import { fellow, interventionGroup, supervisor, weeklyFellowRatings } from "#/db/schema";
import { DropoutFellowSchema, SupervisorSchema, WeeklyFellowRatingSchema } from "./schemas";

export type FellowsData = Awaited<ReturnType<typeof loadFellowsData>>[number];

export async function loadFellowsData() {
  const supervisorProfile = await currentSupervisorLite();

  if (!supervisorProfile) {
    throw new Error("Unauthorised user");
  }

  const supervisorId = supervisorProfile.profile.id;
  const hubId = supervisorProfile.profile.hubId;

  const [fellows, schools, fellowAverageRatings, supervisors] = await Promise.all([
    db.query.fellow.findMany({
      where: (f, { eq }) => eq(f.supervisorId, supervisorId),
      orderBy: (f, { asc }) => asc(f.id),
      with: {
        fellowAttendances: {
          with: {
            session: {
              with: {
                session: true,
                school: true, // Used in AttendanceHistory for school name
              },
            },
            group: true,
            PayoutStatements: {
              // Used in AttendanceHistory for MPESA number and payment status
              orderBy: (p, { desc }) => desc(p.createdAt),
            },
          },
        },
        weeklyFellowRatings: true,
        groups: {
          with: {
            interventionGroupReports: { with: { session: true } },
            students: {
              extras: (st, { sql }) => ({
                clinicalCasesCount:
                  sql<number>`(select count(*) from (select student_id from clinical_screening_info) c where c.student_id = ${st.id})`
                    .mapWith(Number)
                    .as("clinical_cases_count"),
              }),
            },
          },
        },
        fellowComplaints: { with: { user: true } },
      },
    }),

    // The groups' schools with their sessions, loaded once and attached per group below instead
    // of being recomputed for every group row by a lateral join.
    db.query.school.findMany({
      where: (s, { inArray }) =>
        inArray(
          s.id,
          db
            .select({ id: interventionGroup.schoolId })
            .from(interventionGroup)
            .where(
              inArray(
                interventionGroup.leaderId,
                db
                  .select({ id: fellow.id })
                  .from(fellow)
                  .where(eq(fellow.supervisorId, supervisorId)),
              ),
            ),
        ),
      with: {
        interventionSessions: {
          orderBy: (s, { asc }) => asc(s.sessionDate),
          with: { session: true },
        },
      },
    }),

    queryRaw<{ id: string; averageRating: number | null }>(sql`
      SELECT
        f.id,
        ((AVG(wfr.behaviour_rating) + AVG(wfr.dressing_and_grooming_rating) + AVG(wfr.program_delivery_rating) + AVG(wfr.punctuality_rating)) / 4)::float8 AS "averageRating"
      FROM
        fellows f
          LEFT JOIN weekly_fellow_ratings wfr ON f.id = wfr.fellow_id
      WHERE f.hub_id =${hubId}
      GROUP BY
        f.id
    `),

    db.query.supervisor.findMany({
      where: (s, { eq, isNull }) => (hubId === null ? isNull(s.hubId) : eq(s.hubId, hubId)),
      with: { fellows: { columns: { id: true, fellowName: true } } },
    }),
  ]);

  const supervisorNameById = new Map(supervisors.map((s) => [s.id, s.supervisorName]));
  const averageRatingById = new Map(
    fellowAverageRatings.map((rating) => [rating.id, rating.averageRating]),
  );
  const schoolById = new Map(schools.map((s) => [s.id, s]));
  const schoolOf = (schoolId: string) => {
    const found = schoolById.get(schoolId);
    if (!found) throw new Error(`School ${schoolId} not found`);
    return found;
  };

  return fellows.map((fellowRow) => {
    const attendancesByGroupId = new Map<string, typeof fellowRow.fellowAttendances>();
    for (const attendance of fellowRow.fellowAttendances) {
      if (!attendance.groupId) continue;
      const existing = attendancesByGroupId.get(attendance.groupId);
      if (existing) {
        existing.push(attendance);
      } else {
        attendancesByGroupId.set(attendance.groupId, [attendance]);
      }
    }

    // Readers still use the `_count` shape; flatten it together with them (ENG-2161).
    const groups = fellowRow.groups.map((group) => ({
      ...group,
      school: schoolOf(group.schoolId),
      students: group.students.map(({ clinicalCasesCount, ...student }) => ({
        ...student,
        _count: { clinicalCases: clinicalCasesCount },
      })),
    }));

    return {
      county: fellowRow.county,
      subCounty: fellowRow.subCounty,
      fellowName: fellowRow.fellowName,
      fellowEmail: fellowRow.fellowEmail,
      cellNumber: fellowRow.cellNumber,
      mpesaNumber: fellowRow.mpesaNumber,
      mpesaName: fellowRow.mpesaName,
      createdAt: fellowRow.createdAt,
      droppedOut: fellowRow.droppedOut,
      droppedOutAt: fellowRow.droppedOutAt,
      idNumber: fellowRow.idNumber,
      gender: fellowRow.gender,
      dateOfBirth: fellowRow.dateOfBirth ?? null,
      supervisorId: fellowRow.supervisorId,
      supervisorName: supervisorNameById.get(fellowRow.supervisorId ?? "") ?? null,
      id: fellowRow.id,
      weeklyFellowRatings: fellowRow.weeklyFellowRatings,
      sessions: groups.map((group) => ({
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
          numClinicalCases: student._count.clinicalCases,
        })),
      })),
      attendances: fellowRow.fellowAttendances,
      groups: groups.map((group) => ({
        ...group,
        attendances: attendancesByGroupId.get(group.id) ?? [],
      })),
      complaints: fellowRow.fellowComplaints,
      averageRating: Number(averageRatingById.get(fellowRow.id) ?? 0),
    };
  });
}

export async function submitWeeklyFellowRating(data: WeeklyFellowRatingSchema) {
  try {
    const supervisorProfile = await currentSupervisor();

    if (!supervisorProfile) {
      return {
        success: false,
        message: "User is not authorised",
      };
    }
    const parsedData = WeeklyFellowRatingSchema.parse(data);

    await db.insert(weeklyFellowRatings).values({
      ...parsedData,
      supervisorId: supervisorProfile.profile.id,
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

export async function dropoutFellowWithReason(
  fellowId: (typeof fellow.$inferSelect)["id"],
  dropoutReason: (typeof fellow.$inferSelect)["dropOutReason"],
  revalidationPath: string,
) {
  try {
    const supervisorProfile = await currentSupervisor();

    if (!supervisorProfile) {
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
      dropoutReason,
    });

    const [updated] = await db
      .update(fellow)
      .set({
        droppedOut: true,
        droppedOutAt: new Date(),
        dropOutReason: data.dropoutReason,
      })
      .where(eq(fellow.id, data.fellowId))
      .returning();
    if (!updated) {
      throw new Error(`Fellow ${data.fellowId} not found`);
    }

    revalidatePath(revalidationPath);
    return {
      success: true,
      message: "Successfully dropped out the fellow",
      fellow: updated,
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

export async function updateSupervisorProfile(formData: z.infer<typeof SupervisorSchema>) {
  try {
    const user = await currentSupervisor();
    if (!user?.session.user.id) {
      return { success: false, message: "Unauthorized" };
    }

    const data = SupervisorSchema.parse(formData);

    const dateValue = data.dateOfBirth ? new Date(data.dateOfBirth) : null;
    if (dateValue && Number.isNaN(dateValue.getTime())) {
      return { success: false, message: "Invalid date format" };
    }

    const [updated] = await db
      .update(supervisor)
      .set({
        supervisorEmail: data.supervisorEmail,
        supervisorName: data.supervisorName,
        idNumber: data.idNumber,
        cellNumber: data.cellNumber,
        mpesaNumber: data.mpesaNumber,
        dateOfBirth: dateValue,
        gender: data.gender,
        county: data.county,
        subCounty: data.subCounty,
        bankName: data.bankName,
        bankBranch: data.bankBranch,
      })
      .where(eq(supervisor.id, user.session.user.id))
      .returning();
    if (!updated) {
      throw new Error(`Supervisor ${user.session.user.id} not found`);
    }

    return { success: true, data: updated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        errors: error.issues,
        message: "Validation Error",
      };
    }
    console.error("Error updating supervisor profile:", error);
    return { success: false, message: "Internal Server Error" };
  }
}
