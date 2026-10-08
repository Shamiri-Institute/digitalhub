import { notFound } from "next/navigation";
import { and, eq, inArray } from "drizzle-orm";

import GroupsDataTable from "#/components/common/group/groups-datatable";
import { db } from "#/db/client";
import type { ImplementerRole } from "#/db/enums";
import { interventionGroup, school } from "#/db/schema";
import {
  clinicalCasesCountExtras,
  groupStudentColumns,
  selectSchoolGroups,
} from "#/lib/actions/schedule-data";
import { visibleSchoolIds } from "#/lib/auth/require-hub-role";

export default async function SchoolGroupsPage({
  visibleId,
  role,
}: {
  visibleId: string;
  role: ImplementerRole;
}) {
  const visibleSchools = await visibleSchoolIds();
  const visibleSchool = and(
    eq(school.visibleId, visibleId),
    inArray(school.id, visibleSchools.ids),
  );
  const schoolIds = db.select({ id: school.id }).from(school).where(visibleSchool);

  const [schoolRow, rawGroups, students, reports, supervisors] = await Promise.all([
    db.query.school.findFirst({
      where: (s, { and, eq, inArray }) =>
        and(eq(s.visibleId, visibleId), inArray(s.id, visibleSchools.ids)),
      with: { interventionSessions: { with: { session: true } } },
    }),
    selectSchoolGroups().where(eq(school.visibleId, visibleId)),
    db.query.student.findMany({
      where: (s, { and, isNull, inArray }) =>
        and(isNull(s.archivedAt), inArray(s.schoolId, schoolIds)),
      columns: groupStudentColumns,
      extras: clinicalCasesCountExtras,
    }),
    db.query.interventionGroupReport.findMany({
      where: (r, { inArray }) =>
        inArray(
          r.groupId,
          db
            .select({ id: interventionGroup.id })
            .from(interventionGroup)
            .where(inArray(interventionGroup.schoolId, schoolIds)),
        ),
      with: { session: true },
    }),
    db.query.supervisor.findMany({
      where: (s, { inArray }) =>
        inArray(s.hubId, db.select({ hubId: school.hubId }).from(school).where(visibleSchool)),
      columns: { id: true, supervisorName: true },
      with: { fellows: { columns: { id: true, fellowName: true, droppedOut: true } } },
    }),
  ]);
  if (!schoolRow) {
    notFound();
  }

  const data = rawGroups.map((group) => ({
    ...group,
    students: students.filter((student) => student.assignedGroupId === group.id),
    reports: reports.filter((report) => report.groupId === group.id),
  }));

  return <GroupsDataTable data={data} school={schoolRow} supervisors={supervisors} role={role} />;
}
