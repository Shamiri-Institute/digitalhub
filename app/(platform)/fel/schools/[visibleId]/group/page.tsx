import { eq, inArray, sql } from "drizzle-orm";
import { signOut } from "next-auth/react";

import { currentFellow } from "#/app/auth";
import type { SchoolGroupDataTableData } from "#/components/common/group/columns";
import FellowGroupReportTrigger from "#/components/common/group/fellow-group-report-trigger";
import GroupsDataTable from "#/components/common/group/groups-datatable";
import { db, queryRaw } from "#/db/client";
import { ImplementerRole } from "#/db/enums";
import { interventionGroup, school } from "#/db/schema";

const SUBSTANTIVE_SESSION_TYPES = ["s1", "s2", "s3", "s4"];

export default async function GroupsPage(props: { params: Promise<{ visibleId: string }> }) {
  const params = await props.params;

  const { visibleId } = params;

  const fellow = await currentFellow();
  if (fellow === null) {
    await signOut({ callbackUrl: "/login" });
  }
  const fellowId = fellow?.profile?.id;

  const schoolIds = db
    .select({ id: school.id })
    .from(school)
    .where(eq(school.visibleId, visibleId));
  const schoolGroupIds = db
    .select({ id: interventionGroup.id })
    .from(interventionGroup)
    .where(inArray(interventionGroup.schoolId, schoolIds));

  const data = await Promise.all([
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
      sch.visible_id = ${visibleId} AND fel.id = ${fellowId}
  GROUP BY
      intg.id,
      intg.project_id,
      fel.fellow_name,
      sup.supervisor_name,
      sup.id
  `),
    db.query.student
      .findMany({
        where: (st, { and, inArray, isNull }) =>
          and(isNull(st.archivedAt), inArray(st.schoolId, schoolIds)),
        extras: (st, { sql }) => ({
          clinicalCasesCount:
            sql<number>`(select count(*) from (select student_id from clinical_screening_info) c where c.student_id = ${st.id})`
              .mapWith(Number)
              .as("clinical_cases_count"),
        }),
      })
      // Readers still use the `_count` shape; flatten it together with them (ENG-2161).
      .then((rows) =>
        rows.map(({ clinicalCasesCount, ...student }) => ({
          ...student,
          _count: { clinicalCases: clinicalCasesCount },
        })),
      ),
    db.query.interventionGroupReport.findMany({
      where: (r, { inArray }) => inArray(r.groupId, schoolGroupIds),
      with: { session: true },
    }),
  ]).then((values) => {
    return values[0].map((group) => {
      return {
        ...group,
        students: values[1].filter((student) => {
          return student.assignedGroupId === group.id;
        }),
        reports: values[2].filter((report) => {
          return report.groupId === group.id;
        }),
      };
    });
  });

  const schoolRow = await db.query.school.findFirst({
    where: (s, { eq }) => eq(s.visibleId, visibleId),
    with: { interventionSessions: { with: { session: true } } },
  });
  if (!schoolRow) {
    throw new Error(`School ${visibleId} not found`);
  }

  const role = fellow?.session?.user.activeMembership?.role ?? ImplementerRole.FELLOW;

  const occurredSubstantiveCount = schoolRow.interventionSessions.filter(
    (session) =>
      session.occurred &&
      session.sessionType !== null &&
      SUBSTANTIVE_SESSION_TYPES.includes(session.sessionType),
  ).length;

  const fellowGroupReports =
    role === ImplementerRole.FELLOW
      ? await db.query.fellowGroupReport.findMany({
          // Prisma dropped the fellow filter when the id was undefined; keep that.
          where: (r, { and, eq, inArray }) =>
            and(
              fellowId === undefined ? undefined : eq(r.fellowId, fellowId),
              inArray(r.groupId, schoolGroupIds),
            ),
        })
      : [];

  return (
    <div className="flex flex-col gap-4">
      {role === ImplementerRole.FELLOW
        ? data.map((group) => (
            <FellowGroupReportTrigger
              key={group.id}
              groupId={group.id}
              projectId={group.projectId}
              groupName={group.groupName}
              occurredSubstantiveCount={occurredSubstantiveCount}
              report={fellowGroupReports.find((report) => report.groupId === group.id) ?? null}
            />
          ))
        : null}
      <GroupsDataTable data={data} school={schoolRow} role={role} />
    </div>
  );
}
