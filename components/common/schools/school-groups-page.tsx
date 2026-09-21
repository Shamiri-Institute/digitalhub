import { eq, sql } from "drizzle-orm";

import type { SchoolGroupDataTableData } from "#/components/common/group/columns";
import GroupsDataTable from "#/components/common/group/groups-datatable";
import { db, queryRaw } from "#/db/client";
import type { ImplementerRole } from "#/db/enums";
import { interventionGroup, school } from "#/db/schema";
import { clinicalCasesCountExtras, withClinicalCasesCount } from "#/lib/actions/schedule-data";

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

  const [rawGroups, rawStudents, reports, supervisors] = await Promise.all([
    queryRaw<Omit<SchoolGroupDataTableData, "students">>(sql`
  SELECT
	intg.id,
	intg.group_name AS "groupName",
	intg.group_type AS "groupType",
	intg.leader_id AS "leaderId",
	intg.school_id AS "schoolId",
	intg.project_id AS "projectId",
	intg.archived_at AS "archivedAt",
	fel.fellow_name AS "fellowName",
	sup.supervisor_name AS "supervisorName",
	sup.id AS "supervisorId",
	((AVG(intgr.engagement_1) + AVG(intgr.engagement_2) + AVG(intgr.engagement_3) + AVG(intgr.cooperation_1) + AVG(intgr.cooperation_2) + AVG(intgr.cooperation_3) + AVG(intgr.content)) / 7)::float8 AS "groupRating"
  FROM
      intervention_groups intg
      LEFT JOIN schools sch ON intg.school_id = sch.id
      LEFT JOIN fellows fel ON intg.leader_id = fel.id
      LEFT JOIN supervisors sup ON fel.supervisor_id = sup.id
      LEFT JOIN intervention_group_reports intgr ON intg.id = intgr.group_id
  WHERE
      sch.visible_id = ${visibleId}
  GROUP BY
      intg.id,
      intg.project_id,
      fel.fellow_name,
      sup.supervisor_name,
      sup.id
  `),
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
  const students = rawStudents.map(withClinicalCasesCount);

  const data = rawGroups.map((group) => ({
    ...group,
    students: students.filter((student) => student.assignedGroupId === group.id),
    reports: reports.filter((report) => report.groupId === group.id),
  }));

  return <GroupsDataTable data={data} school={schoolRow} supervisors={supervisors} role={role} />;
}
