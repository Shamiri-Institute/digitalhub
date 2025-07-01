import { signOut } from "next-auth/react";
import { currentFellow } from "#/app/auth";
import SessionsDatatable from "#/components/common/session/sessions-datatable";
import { db } from "#/lib/db";

export default async function SchoolSessionsPage({
  params: { visibleId },
}: {
  params: { visibleId: string };
}) {
  const fellow = await currentFellow();
  if (fellow === null) {
    await signOut({ callbackUrl: "/login" });
  }

  const sessions = await db.interventionSession.findMany({
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
  });

  return (
    <SessionsDatatable
      sessions={sessions}
      role={fellow?.user?.membership.role!}
      fellowId={fellow?.id}
    />
  );
}
