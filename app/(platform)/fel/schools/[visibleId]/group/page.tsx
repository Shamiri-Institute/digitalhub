import { and, eq, inArray, sql } from "drizzle-orm";
import { signOut } from "next-auth/react";

import { currentFellow } from "#/app/auth";
import FellowGroupReportTrigger from "#/components/common/group/fellow-group-report-trigger";
import GroupsDataTable from "#/components/common/group/groups-datatable";
import { db } from "#/db/client";
import { ImplementerRole } from "#/db/enums";
import { fellow, interventionGroup, school } from "#/db/schema";
import { selectSchoolGroups } from "#/lib/actions/schedule-data";

const SUBSTANTIVE_SESSION_TYPES = ["s1", "s2", "s3", "s4"];

export default async function GroupsPage(props: { params: Promise<{ visibleId: string }> }) {
  const params = await props.params;

  const { visibleId } = params;

  const fellowUser = await currentFellow();
  if (fellowUser === null) {
    await signOut({ callbackUrl: "/login" });
  }
  const fellowId = fellowUser?.profile?.id;

  const schoolIds = db
    .select({ id: school.id })
    .from(school)
    .where(eq(school.visibleId, visibleId));
  const schoolGroupIds = db
    .select({ id: interventionGroup.id })
    .from(interventionGroup)
    .where(inArray(interventionGroup.schoolId, schoolIds));

  const data = await Promise.all([
    selectSchoolGroups().where(
      and(
        eq(school.visibleId, visibleId),
        fellowId === undefined ? sql`false` : eq(fellow.id, fellowId),
      ),
    ),
    db.query.student.findMany({
      where: (st, { and, inArray, isNull }) =>
        and(isNull(st.archivedAt), inArray(st.schoolId, schoolIds)),
      extras: (st, { sql }) => ({
        clinicalCasesCount:
          sql<number>`(select count(*)::int from (select student_id from clinical_screening_info) c where c.student_id = ${st.id})`.as(
            "clinical_cases_count",
          ),
      }),
    }),
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

  const role = fellowUser?.session?.user.activeMembership?.role ?? ImplementerRole.FELLOW;

  const occurredSubstantiveCount = schoolRow.interventionSessions.filter(
    (session) =>
      session.occurred &&
      session.sessionType !== null &&
      SUBSTANTIVE_SESSION_TYPES.includes(session.sessionType),
  ).length;

  const fellowGroupReports =
    role === ImplementerRole.FELLOW
      ? await db.query.fellowGroupReport.findMany({
          where: (r, { and, eq, inArray }) =>
            and(
              fellowId === undefined ? sql`false` : eq(r.fellowId, fellowId),
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
