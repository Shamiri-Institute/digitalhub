import type { ImplementerRole } from "@prisma/client";
import SessionsDatatable from "#/components/common/session/sessions-datatable";
import { db } from "#/lib/db";

export default async function SchoolSessionsPage({
  visibleId,
  role,
  supervisorId,
}: {
  visibleId: string;
  role: ImplementerRole;
  supervisorId?: string;
}) {
  // Supervisors and fellow ratings are scoped by the school's own hub, which
  // for hc and sc is the same hub as the signed-in user's.
  const school = await db.school.findUnique({
    where: {
      visibleId,
    },
    select: {
      hubId: true,
    },
  });
  const hubId = school?.hubId ?? "";

  const [sessions, supervisors, fellowRatings] = await Promise.all([
    db.interventionSession.findMany({
      where: {
        school: {
          visibleId,
        },
      },
      include: {
        hub: {
          select: { visibleId: true },
        },
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
    db.supervisor.findMany({
      where: {
        hubId,
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
            groups: {
              include: {
                _count: {
                  select: {
                    students: true,
                  },
                },
              },
            },
          },
        },
        assignedSchools: true,
      },
    }),
    db.$queryRaw<
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
    WHERE fel.hub_id=${hubId}
    GROUP BY fel.id`,
  ]);

  return (
    <SessionsDatatable
      sessions={sessions}
      supervisors={supervisors}
      fellowRatings={fellowRatings}
      role={role}
      supervisorId={supervisorId}
    />
  );
}
