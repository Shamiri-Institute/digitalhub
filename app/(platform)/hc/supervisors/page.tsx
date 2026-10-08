import { Suspense } from "react";

import GraphLoadingIndicator from "#/app/(platform)/hc/components/graph-loading-indicator";
import MainSupervisorsDataTable from "#/app/(platform)/hc/supervisors/components/main-supervisors-datatable";
import SupervisorChartsWrapper from "#/app/(platform)/hc/supervisors/components/supervisor-charts-container";
import WeeklyHubTeamMeetingForm from "#/app/(platform)/hc/supervisors/components/weekly-hub-team-meeting";
import { currentHubCoordinator } from "#/app/auth";
import { InvalidPersonnelRole } from "#/components/common/invalid-personnel-role";
import { redirect } from "next/navigation";
import PageFooter from "#/components/ui/page-footer";
import PageHeading from "#/components/ui/page-heading";
import { Separator } from "#/components/ui/separator";
import { db } from "#/db/client";
import type { ImplementerRole } from "#/db/enums";

export default async function SupervisorsPage() {
  const coordinator = await currentHubCoordinator();
  if (!coordinator) {
    return <InvalidPersonnelRole userRole="hub-coordinator" />;
  }

  const hubId = coordinator.profile.assignedHubId;
  if (!hubId) {
    redirect("/login");
  }

  return (
    <div className="flex h-full flex-col">
      <div className="container w-full grow space-y-3 py-10">
        <PageHeading title="Supervisors" />
        <Separator />
        <div className="flex items-center justify-between">
          <div className="flex gap-3">{/* search filters go here */}</div>
          <div className="flex items-center gap-3">
            <WeeklyHubTeamMeetingForm hubCoordinatorId={coordinator.profile.id} hubId={hubId} />
          </div>
        </div>

        <Suspense fallback={<GraphLoadingIndicator />}>
          <SupervisorChartsWrapper coordinator={{ assignedHubId: hubId }} />
        </Suspense>

        <Separator />

        <SupervisorsTable
          hubId={hubId}
          projectId={coordinator.profile.assignedHub?.projectId ?? null}
          role={coordinator.session.user.activeMembership?.role ?? "HUB_COORDINATOR"}
        />
      </div>
      <PageFooter />
    </div>
  );
}

async function SupervisorsTable({
  hubId,
  projectId,
  role,
}: {
  hubId: string;
  projectId: string | null;
  role: ImplementerRole;
}) {
  const [supervisors, project] = await Promise.all([
    db.query.supervisor.findMany({
      where: (s, { eq }) => eq(s.hubId, hubId),
      with: {
        assignedSchools: {
          columns: { schoolName: true },
          orderBy: (school, { asc }) => [asc(school.schoolName), asc(school.id)],
        },
        fellows: { columns: { droppedOut: true } },
        monthlySupervisorEvaluation: true,
      },
      orderBy: (s, { asc }) => asc(s.supervisorName),
    }),
    projectId
      ? db.query.project.findFirst({
          where: (p, { eq }) => eq(p.id, projectId),
          columns: { actualStartDate: true, actualEndDate: true },
        })
      : undefined,
  ]);

  return (
    <MainSupervisorsDataTable supervisors={supervisors} project={project ?? null} role={role} />
  );
}
