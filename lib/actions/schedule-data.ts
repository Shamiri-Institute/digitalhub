import { sql } from "drizzle-orm";

import { db, queryRaw } from "#/db/client";
import { clinicalScreeningInfo, student } from "#/db/schema";
import { countOf } from "#/db/sql";

// Shared reads behind the schedule and school sub-pages. The schedule components still
// declare their props with `Prisma.*GetPayload` types, so `_count` objects are rebuilt from
// the count columns until those components move to exported result types (ENG-2158).

/** `extras` for a `student` relation that mirrors Prisma's `_count: { clinicalCases }`. */
export const clinicalCasesCountExtras = (s: { id: typeof student.id }) => ({
  clinicalCasesCount: countOf(clinicalScreeningInfo.studentId, s.id).as("clinical_cases_count"),
});

export function withClinicalCasesCount<T extends { clinicalCasesCount: number }>({
  clinicalCasesCount,
  ...row
}: T) {
  return { ...row, _count: { clinicalCases: clinicalCasesCount } };
}

/** Supervisors of a hub with the attendance, fellow and group data the schedule views read. */
export async function fetchScheduleSupervisors(hubId: string) {
  const rows = await db.query.supervisor.findMany({
    where: (s, { eq }) => eq(s.hubId, hubId),
    with: {
      supervisorAttendances: { with: { session: true } },
      fellows: {
        with: {
          fellowAttendances: true,
          groups: {
            extras: (g) => ({
              studentsCount: countOf(student.assignedGroupId, g.id).as("students_count"),
            }),
          },
        },
      },
      assignedSchools: true,
    },
  });
  return rows.map((s) => ({
    ...s,
    fellows: s.fellows.map((f) => ({
      ...f,
      groups: f.groups.map(({ studentsCount, ...g }) => ({
        ...g,
        _count: { students: studentsCount },
      })),
    })),
  }));
}

export type ScheduleSupervisor = Awaited<ReturnType<typeof fetchScheduleSupervisors>>[number];

/** Average weekly rating per fellow of a hub; NULL for fellows without ratings. */
export function fetchHubFellowRatings(hubId: string) {
  return queryRaw<{ id: string; averageRating: number | null }>(sql`SELECT
    fel.id,
    ((AVG(wfr.behaviour_rating) + AVG(wfr.dressing_and_grooming_rating) + AVG(wfr.program_delivery_rating) + AVG(wfr.punctuality_rating)) / 4)::float8 AS "averageRating"
    FROM
    fellows fel
    LEFT JOIN weekly_fellow_ratings wfr ON fel.id = wfr.fellow_id
    WHERE fel.hub_id=${hubId}
    GROUP BY fel.id`);
}
