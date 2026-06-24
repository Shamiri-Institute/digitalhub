import { ImplementerRole } from "@prisma/client";
import { signOut } from "next-auth/react";
import { currentFellow } from "#/app/auth";
import type { SchoolGroupDataTableData } from "#/components/common/group/columns";
import FellowGroupReportTrigger from "#/components/common/group/fellow-group-report-trigger";
import GroupsDataTable from "#/components/common/group/groups-datatable";
import { db } from "#/lib/db";

const SUBSTANTIVE_SESSION_TYPES = ["s1", "s2", "s3", "s4"];

export default async function GroupsPage(props: { params: Promise<{ visibleId: string }> }) {
  const params = await props.params;

  const { visibleId } = params;

  const fellow = await currentFellow();
  if (fellow === null) {
    await signOut({ callbackUrl: "/login" });
  }

  const data = await Promise.all([
    await db.$queryRaw<Omit<SchoolGroupDataTableData, "students">[]>`
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
	(AVG(intgr.engagement_1) + AVG(intgr.engagement_2) + AVG(intgr.engagement_3) + AVG(intgr.cooperation_1) + AVG(intgr.cooperation_2) + AVG(intgr.cooperation_3) + AVG(intgr.content)) / 7 AS "groupRating"
  FROM
      intervention_groups intg
      LEFT JOIN schools sch ON intg.school_id = sch.id
      LEFT JOIN fellows fel ON intg.leader_id = fel.id
      LEFT JOIN supervisors sup ON fel.supervisor_id = sup.id
      LEFT JOIN intervention_group_reports intgr ON intg.id = intgr.group_id
  WHERE
      sch.visible_id = ${visibleId} AND fel.id = ${fellow?.profile?.id}
  GROUP BY
      intg.id,
      intg.project_id,
      fel.fellow_name,
      sup.supervisor_name,
      sup.id
  `,
    db.student.findMany({
      where: {
        archivedAt: null,
        school: {
          visibleId,
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
            visibleId,
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

  const role = fellow?.session?.user.activeMembership?.role ?? ImplementerRole.FELLOW;

  const occurredSubstantiveCount = school.interventionSessions.filter(
    (session) =>
      session.occurred &&
      session.sessionType !== null &&
      SUBSTANTIVE_SESSION_TYPES.includes(session.sessionType),
  ).length;

  const fellowGroupReports =
    role === ImplementerRole.FELLOW
      ? await db.fellowGroupReport.findMany({
          where: {
            fellowId: fellow?.profile?.id,
            group: { school: { visibleId } },
          },
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
      <GroupsDataTable data={data} school={school} role={role} />
    </div>
  );
}
