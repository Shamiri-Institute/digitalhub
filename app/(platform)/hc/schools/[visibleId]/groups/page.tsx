import { SchoolGroupDataTableData } from "#/app/(platform)/hc/schools/[visibleId]/groups/components/columns";
import GroupsDataTable from "#/app/(platform)/hc/schools/[visibleId]/groups/components/groups-datatable";
import GroupsTableSkeleton from "#/app/(platform)/hc/schools/[visibleId]/groups/loading";
import { currentHubCoordinator } from "#/app/auth";
import { db } from "#/lib/db";
import { signOut } from "next-auth/react";
import { Suspense } from "react";

export default async function FellowsPage({
  params: { visibleId },
}: {
  params: { visibleId: string };
}) {
  const hc = await currentHubCoordinator();
  if (!hc) {
    await signOut({ callbackUrl: "/login" });
  }

  const groups = await db.$queryRaw<SchoolGroupDataTableData[]>`
  SELECT
	intg.id,
	intg.group_name AS "groupName",
	intg.leader_id AS "leaderId",
	intg.school_id AS "schoolId",
	intg.archived_at AS "archivedAt",
	fel.fellow_name AS "fellowName",
	sup.supervisor_name AS "supervisorName",
	sup.id AS "supervisorId",
	COUNT(stu.*) AS "studentCount",
	(AVG(intgr.engagement_1) + AVG(intgr.engagement_2) + AVG(intgr.engagement_3) + AVG(intgr.cooperation_1) + AVG(intgr.cooperation_2) + AVG(intgr.cooperation_3) + AVG(intgr.content)) / 7 AS "groupRating"
  FROM
      intervention_groups intg
      LEFT JOIN schools sch ON intg.school_id = sch.id
      LEFT JOIN fellows fel ON intg.leader_id = fel.id
      LEFT JOIN supervisors sup ON fel.supervisor_id = sup.id
      LEFT JOIN intervention_group_reports intgr ON intg.id = intgr.group_id
      LEFT JOIN students stu ON stu.assigned_group_id = intg.id
  WHERE
      sch.visible_id = ${visibleId}
  GROUP BY
      intg.id,
      fel.fellow_name,
      sup.supervisor_name,
      sup.id
  `;

  return (
    <Suspense fallback={<GroupsTableSkeleton />}>
      <GroupsDataTable data={groups} />
    </Suspense>
  );
}
