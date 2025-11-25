import { signOut } from "next-auth/react";
import { currentFellow } from "#/app/auth";
import SessionsDatatable from "#/components/common/session/sessions-datatable";
import { db } from "#/lib/db";
import { ImplementerRole } from "@prisma/client";

export default async function SchoolSessionsPage(props: {
  params: Promise<{ visibleId: string }>;
}) {
  const params = await props.params;

  const { visibleId } = params;

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
      role={fellow?.session?.user.activeMembership?.role ?? ImplementerRole.FELLOW}
      fellowId={fellow?.profile?.id}
    />
  );
}
