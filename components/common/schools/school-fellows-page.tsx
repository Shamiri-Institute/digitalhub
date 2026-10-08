import { notFound } from "next/navigation";
import { and, eq, inArray, sql } from "drizzle-orm";

import FellowsDatatable from "#/components/common/fellow/fellows-datatable";
import { db } from "#/db/client";
import type { ImplementerRole } from "#/db/enums";
import { fellow, interventionGroup, school, supervisor, weeklyFellowRatings } from "#/db/schema";
import { clinicalCasesCountExtras, groupStudentColumns } from "#/lib/actions/schedule-data";
import { visibleSchoolIds } from "#/lib/auth/require-hub-role";

export default async function SchoolFellowsPage({
  visibleId,
  role,
  hideActions,
}: {
  visibleId: string;
  role: ImplementerRole;
  hideActions?: boolean;
}) {
  const visibleSchools = await visibleSchoolIds();
  const visibleSchool = and(
    eq(school.visibleId, visibleId),
    inArray(school.id, visibleSchools.ids),
  );
  const schoolIds = db.select({ id: school.id }).from(school).where(visibleSchool);
  const schoolHubId = db.select({ hubId: school.hubId }).from(school).where(visibleSchool);

  const schoolGroups = db
    .select()
    .from(interventionGroup)
    .where(inArray(interventionGroup.schoolId, schoolIds))
    .as("school_groups");
  const [schoolRow, rawFellows, students, supervisors] = await Promise.all([
    db.query.school.findFirst({
      where: (s, { and, eq, inArray }) =>
        and(eq(s.visibleId, visibleId), inArray(s.id, visibleSchools.ids)),
      columns: { id: true },
      with: {
        fellowAttendances: {
          columns: { fellowId: true, attended: true },
          with: {
            session: {
              columns: { sessionDate: true, venue: true },
              with: {
                session: { columns: { sessionLabel: true } },
                school: { columns: { schoolName: true } },
              },
            },
            group: { columns: { groupName: true } },
            PayoutStatements: { columns: { mpesaNumber: true, executedAt: true } },
          },
        },
      },
    }),
    db
      .select({
        id: fellow.id,
        fellowName: fellow.fellowName,
        fellowEmail: fellow.fellowEmail,
        cellNumber: fellow.cellNumber,
        gender: fellow.gender,
        county: fellow.county,
        subCounty: fellow.subCounty,
        supervisorId: fellow.supervisorId,
        supervisorName: supervisor.supervisorName,
        droppedOut: fellow.droppedOut,
        groupName: schoolGroups.groupName,
        groupId: schoolGroups.id,
        averageRating: sql<
          number | null
        >`((avg(${weeklyFellowRatings.behaviourRating}) + avg(${weeklyFellowRatings.dressingAndGroomingRating}) + avg(${weeklyFellowRatings.programDeliveryRating}) + avg(${weeklyFellowRatings.punctualityRating})) / 4)::float8`,
      })
      .from(fellow)
      .leftJoin(weeklyFellowRatings, eq(fellow.id, weeklyFellowRatings.fellowId))
      .leftJoin(supervisor, eq(fellow.supervisorId, supervisor.id))
      .leftJoin(schoolGroups, eq(fellow.id, schoolGroups.leaderId))
      .where(inArray(fellow.hubId, schoolHubId))
      .groupBy(fellow.id, schoolGroups.id, schoolGroups.groupName, supervisor.supervisorName),
    db.query.student.findMany({
      where: (s, { and, isNull, inArray }) =>
        and(isNull(s.archivedAt), inArray(s.schoolId, schoolIds)),
      columns: groupStudentColumns,
      extras: clinicalCasesCountExtras,
    }),
    db.query.supervisor.findMany({
      where: (s, { inArray }) => inArray(s.hubId, schoolHubId),
      columns: { id: true, supervisorName: true },
      with: { fellows: { columns: { id: true, fellowName: true, droppedOut: true } } },
    }),
  ]);
  if (!schoolRow) {
    notFound();
  }

  const fellows = rawFellows.map((fellow) => ({
    ...fellow,
    students: students.filter((student) => student.assignedGroupId === fellow.groupId),
  }));

  return (
    <FellowsDatatable
      fellows={fellows}
      supervisors={supervisors}
      schoolId={schoolRow.id}
      role={role}
      hideActions={hideActions}
      attendances={schoolRow.fellowAttendances}
    />
  );
}
