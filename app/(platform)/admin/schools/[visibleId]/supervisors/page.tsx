import { currentAdminUser } from "#/app/auth";
import SupervisorsDataTable from "#/components/common/supervisor/supervisors-datatable";
import { db } from "#/lib/db";
import { signOut } from "next-auth/react";

export default async function SupervisorsPage({
  params: { visibleId },
}: {
  params: { visibleId: string };
}) {
  const admin = await currentAdminUser();
  if (admin === null) {
    await signOut({ callbackUrl: "/login" });
  }

  const school = await db.school.findUnique({
    where: {
      visibleId,
    },
    include: {
      interventionSessions: true,
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
      visibleId={visibleId}
      school={school ?? null}
      role={admin?.user.membership.role!}
    />
  );
}
