import { ImplementerRole } from "@prisma/client";
import { signOut } from "next-auth/react";
import { currentAdminUser } from "#/app/auth";
import SupervisorsDataTable from "#/components/common/supervisor/supervisors-datatable";
import { db } from "#/lib/db";

export default async function SupervisorsPage({
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
          session: true,
        },
      },
    },
  });

  const supervisors = await db.supervisor.findMany({
    where: {
      hub: {
        id: school?.hubId ?? "",
      },
    },
    include: {
      assignedSchools: true,
      fellows: true,
      supervisorAttendances: {
        include: {
          session: true,
        },
        where: {
          school: {
            visibleId,
          },
        },
      },
      monthlySupervisorEvaluation: true,
    },
    orderBy: {
      supervisorName: "asc",
    },
  });

  return (
    <SupervisorsDataTable
      supervisors={supervisors}
      school={school ?? null}
      role={admin?.session?.user.activeMembership?.role ?? ImplementerRole.ADMIN}
    />
  );
}
