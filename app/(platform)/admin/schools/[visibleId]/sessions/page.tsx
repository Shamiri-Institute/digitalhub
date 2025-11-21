import { currentAdminUser } from "#/app/auth";
import SessionsDatatable from "#/components/common/session/sessions-datatable";
import { db } from "#/lib/db";
import { ImplementerRole } from "@prisma/client";
import { signOut } from "next-auth/react";

export default async function SchoolSessionsPage({
  params,
}: {
  params: Promise<{ visibleId: string }>;
}) {
  const { visibleId } = await params;
  const admin = await currentAdminUser();
  if (admin === null) {
    await signOut({ callbackUrl: "/login" });
  }

  const school = await db.school.findUnique({
    where: {
      visibleId,
    },
    include: {
      interventionSessions: {
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
      },
    },
  });

  const [supervisors, fellowRatings] = await Promise.all([
    db.supervisor.findMany({
      where: {
        hubId: school?.hubId ?? "",
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
    WHERE fel.hub_id=${school?.hubId ?? ""}
    GROUP BY fel.id`,
  ]);

  return (
    <SessionsDatatable
      sessions={school?.interventionSessions ?? []}
      supervisors={supervisors}
      fellowRatings={fellowRatings}
      role={admin?.session?.user.activeMembership?.role ?? ImplementerRole.ADMIN}
    />
  );
}
