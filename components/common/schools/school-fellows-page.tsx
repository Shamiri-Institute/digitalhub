import { eq, sql } from "drizzle-orm";

import FellowsDatatable from "#/components/common/fellow/fellows-datatable";
import { db } from "#/db/client";
import type { ImplementerRole } from "#/db/enums";
import { fellow, interventionGroup, school, supervisor, weeklyFellowRatings } from "#/db/schema";
import { clinicalCasesCountExtras } from "#/lib/actions/schedule-data";

export default async function SchoolFellowsPage({
  visibleId,
  role,
  hideActions,
}: {
  visibleId: string;
  role: ImplementerRole;
  hideActions?: boolean;
}) {
  const schoolRow = await db.query.school.findFirst({
    where: (s, { eq }) => eq(s.visibleId, visibleId),
    with: {
      fellowAttendances: {
        with: {
          session: { with: { session: true, school: true } },
          group: true,
          PayoutStatements: true,
        },
      },
      hub: { with: { project: true } },
    },
  });
  if (!schoolRow) {
    throw new Error("No School found");
  }

  const schoolGroups = db
    .select()
    .from(interventionGroup)
    .where(eq(interventionGroup.schoolId, schoolRow.id))
    .as("school_groups");
  const [rawFellows, students, supervisors] = await Promise.all([
    db
      .select({
        id: fellow.id,
        fellowName: fellow.fellowName,
        fellowEmail: fellow.fellowEmail,
        cellNumber: fellow.cellNumber,
        mpesaNumber: fellow.mpesaNumber,
        mpesaName: fellow.mpesaName,
        gender: fellow.gender,
        county: fellow.county,
        subCounty: fellow.subCounty,
        supervisorId: fellow.supervisorId,
        dateOfBirth: fellow.dateOfBirth,
        idNumber: fellow.idNumber,
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
      .where(eq(fellow.hubId, schoolRow.hubId ?? ""))
      .groupBy(fellow.id, schoolGroups.id, schoolGroups.groupName, supervisor.supervisorName),
    db.query.student.findMany({
      where: (s, { and, isNull, inArray }) =>
        and(
          isNull(s.archivedAt),
          inArray(
            s.schoolId,
            db.select({ id: school.id }).from(school).where(eq(school.visibleId, visibleId)),
          ),
        ),
      extras: clinicalCasesCountExtras,
    }),
    db.query.supervisor.findMany({
      where: (s, { eq }) => eq(s.hubId, schoolRow.hubId ?? ""),
      with: { fellows: true },
    }),
  ]);

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
