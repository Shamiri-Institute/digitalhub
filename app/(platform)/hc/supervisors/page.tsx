import { InvalidPersonnelRole } from "#/components/common/invalid-personnel-role";

import {
  fetchSupervisorDataCompletenessData,
  fetchSupervisorDropoutReasons,
  fetchSupervisorSessionRatingAverages,
} from "#/app/(platform)/hc/supervisors/actions";
import AddNewSupervisor from "#/app/(platform)/hc/supervisors/components/add-new-supervisor";
import MainSupervisorsDataTable from "#/app/(platform)/hc/supervisors/components/main-supervisors-datatable";
import SupervisorCharts from "#/app/(platform)/hc/supervisors/components/superivor-charts";
import SupervisorProvider from "#/app/(platform)/hc/supervisors/components/supervisor-provider";
import WeeklyHubTeamMeetingForm from "#/app/(platform)/hc/supervisors/components/weekly-hub-team-meeting";
import { currentHubCoordinator } from "#/app/auth";
import PageFooter from "#/components/ui/page-footer";
import PageHeading from "#/components/ui/page-heading";
import { Separator } from "#/components/ui/separator";
import { db } from "#/lib/db";

export default async function SupervisorsPage() {
  const coordinator = await currentHubCoordinator();
  const supervisors = await db.supervisor.findMany({
    where: {
      hubId: coordinator?.assignedHubId,
    },
    include: {
      assignedSchools: true,
      fellows: true,
      hub: {
        include: {
          project: true,
        },
      },
      monthlySupervisorEvaluation: true,
    },
    orderBy: {
      supervisorName: "asc",
    },
  });

  if (!coordinator) {
    return <InvalidPersonnelRole role="hub-coordinator" />;
  }

  if (!coordinator.assignedHubId) {
    return <div>Hub coordinator has no assigned hub</div>;
  }

  const dropoutData = await fetchSupervisorDropoutReasons(
    coordinator.assignedHubId,
  );

  const supervisorDataCompletenessPercentage =
    await fetchSupervisorDataCompletenessData(coordinator?.assignedHubId);

  const supervisorsSessionRatings = await fetchSupervisorSessionRatingAverages(
    coordinator?.assignedHubId as string,
  );

  const supervisorAttendanceData = await db.interventionSession.groupBy({
    by: ["sessionType"],
    where: {
      school: {
        hubId: coordinator?.assignedHubId,
        supervisorAttendances: {
          every: {
            attended: true,
          },
        },
      },
    },
    _count: {
      sessionType: true,
    },
  });

  return (
    <div className="flex h-full flex-col">
      <div className="container w-full grow space-y-3 py-10">
        <PageHeading title="Supervisors" />
        <Separator />
        <div className="flex items-center justify-between">
          <div className="flex gap-3">{/* search filters go here */}</div>
          <div className="flex items-center gap-3">
            <AddNewSupervisor />
            <WeeklyHubTeamMeetingForm
              hubCoordinatorId={coordinator?.id}
              hubId={coordinator?.assignedHubId}
            />
          </div>
        </div>

        <SupervisorCharts
          attendanceData={supervisorAttendanceData}
          dropoutData={dropoutData}
          supervisorDataCompletenessPercentage={
            supervisorDataCompletenessPercentage
          }
          supervisorsSessionRatings={supervisorsSessionRatings}
        />

        <Separator />

        <SupervisorProvider>
          <MainSupervisorsDataTable supervisors={supervisors} />
        </SupervisorProvider>
      </div>
      <PageFooter />
    </div>
  );
}
