import { ImplementerRole } from "@prisma/client";
import { signOut } from "next-auth/react";
import { currentFellow } from "#/app/auth";
import type { SchoolGroupDataTableData } from "#/components/common/group/columns";
import GroupsDataTable from "#/components/common/group/groups-datatable";
import { db } from "#/lib/db";
import type { PaginationMeta } from "#/lib/types/pagination";

type Props = {
  params: Promise<{ visibleId: string }>;
  searchParams: Promise<{ page?: string; pageSize?: string }>;
};

export default async function GroupsPage({ params, searchParams }: Props) {
  const { visibleId } = await params;
  const { page = "1", pageSize = "20" } = await searchParams;

  const fellow = await currentFellow();
  if (fellow === null) {
    await signOut({ callbackUrl: "/login" });
    return null;
  }

  const pageNum = Math.max(1, Number(page) || 1);
  const size = Math.min(50, Math.max(5, Number(pageSize) || 20));
  const skip = (pageNum - 1) * size;
  const fellowId = fellow.profile?.id;

  const [groupsRaw, countResult] = await Promise.all([
    db.$queryRaw<Omit<SchoolGroupDataTableData, "students" | "reports">[]>`
      SELECT
        intg.id,
        intg.group_name AS "groupName",
        intg.group_type AS "groupType",
        intg.leader_id AS "leaderId",
        intg.school_id AS "schoolId",
        intg.archived_at AS "archivedAt",
        fel.fellow_name AS "fellowName",
        sup.supervisor_name AS "supervisorName",
        sup.id AS "supervisorId",
        (AVG(intgr.engagement_1) + AVG(intgr.engagement_2) + AVG(intgr.engagement_3) + AVG(intgr.cooperation_1) + AVG(intgr.cooperation_2) + AVG(intgr.cooperation_3) + AVG(intgr.content)) / 7 AS "groupRating"
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
          fel.fellow_name,
          sup.supervisor_name,
          sup.id
      ORDER BY intg.group_name
      LIMIT ${size} OFFSET ${skip}
    `,
    db.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(DISTINCT intg.id) AS count
      FROM intervention_groups intg
      LEFT JOIN schools sch ON intg.school_id = sch.id
      LEFT JOIN fellows fel ON intg.leader_id = fel.id
      WHERE sch.visible_id = ${visibleId} AND fel.id = ${fellowId}
    `,
  ]);

  const totalCount = Number(countResult[0]?.count ?? 0);
  const groupIds = groupsRaw.map((g) => g.id);

  const [students, reports] = await Promise.all([
    groupIds.length > 0
      ? db.student.findMany({
          where: {
            archivedAt: null,
            assignedGroupId: { in: groupIds },
          },
          include: {
            _count: {
              select: {
                clinicalCases: true,
              },
            },
          },
        })
      : Promise.resolve([]),
    groupIds.length > 0
      ? db.interventionGroupReport.findMany({
          where: { groupId: { in: groupIds } },
          include: { session: true },
        })
      : Promise.resolve([]),
  ]);

  const data: SchoolGroupDataTableData[] = groupsRaw.map((group) => ({
    ...group,
    students: students.filter((s) => s.assignedGroupId === group.id),
    reports: reports.filter((r) => r.groupId === group.id),
  }));

  const school = await db.school.findFirstOrThrow({
    where: { visibleId },
    include: {
      interventionSessions: {
        include: {
          session: true,
        },
      },
    },
  });

  const pagination: PaginationMeta = {
    page: pageNum,
    pageSize: size,
    totalCount,
    totalPages: Math.ceil(totalCount / size),
  };

  return (
    <GroupsDataTable
      data={data}
      school={school}
      role={fellow.session?.user.activeMembership?.role ?? ImplementerRole.FELLOW}
      pagination={pagination}
    />
  );
}
