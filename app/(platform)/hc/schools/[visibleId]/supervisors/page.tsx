import { currentHubCoordinator } from "#/app/auth";
import SupervisorsDataTable from "#/components/common/supervisor/supervisors-datatable";
import { db } from "#/lib/db";
import { signOut } from "next-auth/react";

export default async function SupervisorsPage({
  params,
}: {
  params: Promise<{ visibleId: string }>;
}) {
  const { visibleId } = await params;
  const coordinator = await currentHubCoordinator();
  if (coordinator === null) {
    await signOut({ callbackUrl: "/login" });
  }
  const supervisors = await db.supervisor.findMany({
    where: {
      hubId: coordinator?.profile?.assignedHubId ?? null,
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
  const school = await db.school.findUnique({
    where: {
      visibleId,
    },
    include: {
      interventionSessions: true,
    },
  });
  if (!coordinator?.session?.user.activeMembership?.role) {
    return <div>Invalid role</div>;
  }

  return (
    <SupervisorsDataTable
      supervisors={supervisors}
      role={coordinator.session.user.activeMembership.role}
      school={school ?? null}
    />
  );
}
