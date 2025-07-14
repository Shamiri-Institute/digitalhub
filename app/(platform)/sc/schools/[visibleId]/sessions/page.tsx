import { signOut } from "next-auth/react";
import { currentSupervisor } from "#/app/auth";
import SessionsDatatable from "#/components/common/session/sessions-datatable";
import { db } from "#/lib/db";

export default async function SchoolSessionsPage(props: {
  params: Promise<{ visibleId: string }>;
}) {
  const params = await props.params;

  const { visibleId } = params;

  const supervisor = await currentSupervisor();
  if (supervisor === null) {
    await signOut({ callbackUrl: "/login" });
  }

  const data = await Promise.all([
    await db.interventionSession.findMany({
      where: {
        school: {
          visibleId,
        },
      },
      include: {
        school: {
          include: {
            assignedSupervisor: true,
            interventionGroups: {
              include: {
                students: {
                  include: {
                    _count: {
                      select: {
                        clinicalCases: true,
                      },
                    },
                    studentAttendances: true,
                  },
                },
              },
            },
          },
        },
        sessionRatings: true,
        session: true,
      },
    }),
    await db.supervisor.findMany({
      where: {
        hubId: supervisor?.hubId as string,
      },
      include: {
        supervisorAttendances: {
          include: {
            session: true,
          },
        },
        fellows: {
          include: {
            fellowAttendances: true,
            groups: true,
          },
        },
        assignedSchools: true,
      },
    }),
    await db.$queryRaw<
      {
        id: string;
        averageRating: number;
      }[]
    >`SELECT
    fel.id,
    (AVG(wfr.behaviour_rating) + AVG(wfr.dressing_and_grooming_rating) + AVG(wfr.program_delivery_rating) + AVG(wfr.punctuality_rating)) / 4 AS "averageRating"
    FROM
    fellows fel
    LEFT JOIN weekly_fellow_ratings wfr ON fel.id = wfr.fellow_id
    WHERE fel.hub_id=${supervisor!.hubId}
    GROUP BY fel.id`,
  ]);

  return (
    <SessionsDatatable
      sessions={data[0]}
      supervisors={data[1]}
      fellowRatings={data[2]}
      role={supervisor?.user?.membership.role!}
      supervisorId={supervisor?.id}
    />
  );
}
