import { signOut } from "next-auth/react";
import { currentHubCoordinator } from "#/app/auth";
import SessionsDatatable from "#/components/common/session/sessions-datatable";
import { db } from "#/lib/db";
import { ImplementerRole } from "@prisma/client";

export default async function SchoolSessionsPage({
  params,
}: {
  params: Promise<{ visibleId: string }>;
}) {
  const { visibleId } = await params;
  const coordinator = await currentHubCoordinator();
  if (coordinator === null) {
    await signOut({ callbackUrl: "/login" });
  }
  const assignedHubId = coordinator?.profile?.assignedHubId;

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
      orderBy: {
        sessionDate: "asc",
      },
    }),
    await db.supervisor.findMany({
      where: {
        hubId: assignedHubId,
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
    WHERE fel.hub_id=${assignedHubId}
    GROUP BY fel.id`,
  ]);

  return (
    <SessionsDatatable
      sessions={data[0]}
      supervisors={data[1]}
      fellowRatings={data[2]}
      role={coordinator?.session?.user.activeMembership?.role ?? ImplementerRole.HUB_COORDINATOR}
    />
  );
}
