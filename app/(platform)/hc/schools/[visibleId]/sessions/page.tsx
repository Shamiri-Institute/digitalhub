import SessionsDatatable from "#/app/(platform)/hc/schools/[visibleId]/sessions/components/sessions-datatable";
import { currentHubCoordinator } from "#/app/auth";
import { db } from "#/lib/db";
import { signOut } from "next-auth/react";

export default async function SchoolSessionsPage({
  params: { visibleId },
}: {
  params: { visibleId: string };
}) {
  const coordinator = await currentHubCoordinator();
  if (coordinator === null) {
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
        },
      },
      sessionRatings: true,
    },
  });

  const supervisors = await db.supervisor.findMany({
    where: {
      hubId: coordinator?.assignedHubId as string,
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
        },
      },
      assignedSchools: true,
    },
  });

  return <SessionsDatatable sessions={sessions} supervisors={supervisors} />;
}
