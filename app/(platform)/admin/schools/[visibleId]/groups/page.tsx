import { ImplementerRole } from "@prisma/client";
import { signOut } from "next-auth/react";
import { currentAdminUser } from "#/app/auth";
import type { SchoolGroupDataTableData } from "#/components/common/group/columns";
import GroupsDataTable from "#/components/common/group/groups-datatable";
import { db } from "#/lib/db";

export default async function GroupsPage({ params }: { params: Promise<{ visibleId: string }> }) {
  const { visibleId } = await params;
  const admin = await currentAdminUser();
  if (admin === null) {
    await signOut({ callbackUrl: "/login" });
  }

  const school = await db.school.findFirstOrThrow({
    where: {
      visibleId,
    },
    include: {
      interventionSessions: {
        include: {
          session: true,
        },
      },
    },
  });

  const data = await Promise.all([
    await db.$queryRaw<Omit<SchoolGroupDataTableData, "students">[]>`
  SELECT
	intg.id,
	intg.group_name AS "groupName",
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
      sch.id = ${school.id}
  GROUP BY
      intg.id,
      fel.fellow_name,
      sup.supervisor_name,
      sup.id
  `,
    db.student.findMany({
      where: {
        school: {
          id: school.id,
        },
      },
      include: {
        _count: {
          select: {
            clinicalCases: true,
          },
        },
      },
    }),
    db.interventionGroupReport.findMany({
      where: {
        group: {
          school: {
            id: school.id,
          },
        },
      },
      include: {
        session: true,
      },
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

  const supervisors = await db.supervisor.findMany({
    where: {
      hubId: school.hubId,
    },
    include: {
      fellows: true,
    },
  });

  return (
    <GroupsDataTable
      data={data}
      school={school}
      supervisors={supervisors}
      role={admin?.session?.user.activeMembership?.role ?? ImplementerRole.ADMIN}
    />
  );
}
