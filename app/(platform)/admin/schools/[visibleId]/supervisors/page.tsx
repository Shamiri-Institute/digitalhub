import SupervisorInfoProvider from "#/app/(platform)/hc/schools/[visibleId]/supervisors/components/supervisor-info-provider";
import SupervisorsDataTable from "#/app/(platform)/hc/schools/[visibleId]/supervisors/components/supervisors-datatable";
import { currentAdminUser, currentHubCoordinator } from "#/app/auth";
import { db } from "#/lib/db";

export default async function SupervisorsPage({
  params: { visibleId },
}: {
  params: { visibleId: string };
}) {
  const admin = await currentAdminUser();

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
        id: school?.hubId ?? ""
      }
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
    <SupervisorsDataTable supervisors={supervisors} visibleId={visibleId} school={school ?? null} role={admin?.user.membership.role}/>
  );
}
