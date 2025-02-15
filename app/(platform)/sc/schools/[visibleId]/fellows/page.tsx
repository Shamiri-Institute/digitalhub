import Loading from "#/app/(platform)/sc/schools/[visibleId]/fellows/loading";
import { currentSupervisor } from "#/app/auth";
import { SchoolFellowTableData } from "#/components/common/fellow/columns";
import FellowInfoContextProvider from "#/components/common/fellow/fellow-info-context-provider";
import FellowsDatatable from "#/components/common/fellow/fellows-datatable";
import { db } from "#/lib/db";
import { signOut } from "next-auth/react";
import { Suspense } from "react";

export default async function FellowsPage({
  params: { visibleId },
}: {
  params: { visibleId: string };
}) {
  const supervisor = await currentSupervisor();
  if (supervisor === null) {
    await signOut({ callbackUrl: "/login" });
  }

  const [school, supervisors] = await Promise.all([
    await db.school.findFirstOrThrow({
      where: {
        visibleId,
      },
      include: {
        fellowAttendances: {
          include: {
            session: {
              include: {
                session: true,
                school: true,
              },
            },
            group: true,
            PayoutStatements: true,
          },
        },
        hub: {
          include: {
            project: true,
          },
        },
      },
    }),
    await db.supervisor.findMany({
      where: {
        hubId: supervisor?.hubId as string,
      },
      include: {
        fellows: true,
      },
    }),
  ]);

  const data = await Promise.all([
    db.$queryRaw<Omit<SchoolFellowTableData, "students">[]>`
      SELECT
        f.id, 
        f.fellow_name as "fellowName", 
        f.fellow_email as "fellowEmail", 
        f.cell_number as "cellNumber", 
        f.mpesa_number as "mpesaNumber", 
        f.mpesa_name as "mpesaName", 
        f.gender as "gender", 
        f.county as "county", 
        f.sub_county as "subCounty", 
        f.supervisor_id as "supervisorId",
        f.date_of_birth as "dateOfBirth",
        f.id_number as "idNumber",
        sup.supervisor_name as "supervisorName", 
        f.dropped_out as "droppedOut", 
        ig.group_name as "groupName",
        ig.id as "groupId",
        (AVG(wfr.behaviour_rating) + AVG(wfr.dressing_and_grooming_rating) + AVG(wfr.program_delivery_rating) + AVG(wfr.punctuality_rating))/4 AS "averageRating"
      FROM fellows f
      LEFT JOIN weekly_fellow_ratings wfr ON f.id = wfr.fellow_id
      LEFT JOIN supervisors sup ON f.supervisor_id = sup.id
      LEFT JOIN 
        (SELECT _ig.* FROM intervention_groups _ig WHERE _ig.school_id = ${school.id}) ig 
        ON f.id = ig.leader_id
      WHERE f.hub_id = ${school.hubId}
      GROUP BY f.id, ig.id, ig.group_name, sup.supervisor_name
  `,
    db.student.findMany({
      where: {
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
  ]).then((values) => {
    return values[0].map((fellow) => {
      const students = values[1].filter((student) => {
        return student.assignedGroupId === fellow.groupId;
      });
      return {
        ...fellow,
        students,
      };
    });
  });

  return (
    <FellowInfoContextProvider>
      <Suspense fallback={<Loading />}>
        <FellowsDatatable
          fellows={data}
          supervisors={supervisors}
          schoolVisibleId={visibleId}
          role={supervisor?.user.membership.role!}
          attendances={school.fellowAttendances}
        />
      </Suspense>
    </FellowInfoContextProvider>
  );
}
