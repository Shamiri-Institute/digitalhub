import { eq } from "drizzle-orm";

import GroupsDataTable from "#/components/common/group/groups-datatable";
import { db } from "#/db/client";
import type { ImplementerRole } from "#/db/enums";
import { interventionGroup, school } from "#/db/schema";
import { clinicalCasesCountExtras, selectSchoolGroups } from "#/lib/actions/schedule-data";

export default async function SchoolGroupsPage({
  visibleId,
  role,
}: {
  visibleId: string;
  role: ImplementerRole;
}) {
  const schoolRow = await db.query.school.findFirst({
    where: (s, { eq }) => eq(s.visibleId, visibleId),
    with: { interventionSessions: { with: { session: true } } },
  });
  if (!schoolRow) {
    throw new Error("No School found");
  }

  const schoolIds = db
    .select({ id: school.id })
    .from(school)
    .where(eq(school.visibleId, visibleId));

  const [rawGroups, students, reports, supervisors] = await Promise.all([
    selectSchoolGroups().where(eq(school.visibleId, visibleId)),
    db.query.student.findMany({
      where: (s, { and, isNull, inArray }) =>
        and(isNull(s.archivedAt), inArray(s.schoolId, schoolIds)),
      extras: clinicalCasesCountExtras,
    }),
    db.query.interventionGroupReport.findMany({
      where: (r, { inArray }) =>
        inArray(
          r.groupId,
          db
            .select({ id: interventionGroup.id })
            .from(interventionGroup)
            .where(eq(interventionGroup.schoolId, schoolRow.id)),
        ),
      with: { session: true },
    }),
    db.query.supervisor.findMany({
      where: (s, { eq }) => eq(s.hubId, schoolRow.hubId ?? ""),
      with: { fellows: true },
    }),
  ]);

  const data = rawGroups.map((group) => ({
    ...group,
    students: students.filter((student) => student.assignedGroupId === group.id),
    reports: reports.filter((report) => report.groupId === group.id),
  }));

  return <GroupsDataTable data={data} school={schoolRow} supervisors={supervisors} role={role} />;
}
