import { ImplementerRole } from "#/db/enums";
import { signOut } from "next-auth/react";
import { currentHubCoordinator } from "#/app/auth";
import SchoolsDatatable from "#/components/common/schools/schools-datatable";
import { SearchCommand } from "#/components/search-command";
import PageFooter from "#/components/ui/page-footer";
import PageHeading from "#/components/ui/page-heading";
import { Separator } from "#/components/ui/separator";
import {
  fetchDropoutReasons,
  fetchHubSupervisors,
  fetchSchoolAttendances,
  fetchSchoolData,
  fetchSchoolDataCompletenessData,
  fetchSessionRatingAverages,
} from "./actions";
import ChartArea from "./components/chart-area";
import WeeklyHubReportButtonAndForm from "./components/weekly-hub-report-button-and-form";

export default async function SchoolsPage(props: {
  searchParams?: Promise<{
    query?: string;
    page?: string;
  }>;
}) {
  const searchParams = await props.searchParams;
  const queryAsSchoolId = searchParams?.query || "";

  const hubCoordinator = await currentHubCoordinator();
  if (hubCoordinator === null) {
    await signOut({ callbackUrl: "/login" });
  }
  const assignedHubId = hubCoordinator?.profile?.assignedHubId;
  if (!assignedHubId) {
    return <div>Hub coordinator has no assigned hub</div>;
  }

  const [
    data,
    dropoutData,
    schoolDataCompletenessPercentage,
    sessionRatings,
    schoolAttendanceData,
    supervisors,
  ] = await Promise.all([
    fetchSchoolData(assignedHubId),
    fetchDropoutReasons(assignedHubId, queryAsSchoolId),
    fetchSchoolDataCompletenessData(assignedHubId, queryAsSchoolId),
    fetchSessionRatingAverages(assignedHubId, queryAsSchoolId),
    fetchSchoolAttendances(assignedHubId, queryAsSchoolId),
    fetchHubSupervisors({
      where: {
        hubId: assignedHubId,
      },
    }),
  ]);

  return (
    <div className="flex h-full flex-col">
      <div className="container w-full grow space-y-3 py-10">
        <PageHeading title="Schools" />
        <Separator />
        <div className="flex items-center justify-between">
          <div className="flex w-1/4 items-start gap-3">
            <SearchCommand data={data} />
            {/* <SchoolsFilterToggle schools={data} /> */}
          </div>
          <div className="flex items-center gap-3">
            <WeeklyHubReportButtonAndForm
              hubCoordinatorId={hubCoordinator?.profile?.id}
              hubId={assignedHubId}
            />
            {/* TODO: display options button */}
          </div>
        </div>
        <ChartArea
          dropoutData={dropoutData}
          schoolDataCompletenessData={schoolDataCompletenessPercentage}
          sessionRatingsData={sessionRatings}
          schoolAttendances={schoolAttendanceData}
        />
        <Separator />
        <SchoolsDatatable
          role={
            hubCoordinator?.session.user.activeMembership?.role ?? ImplementerRole.HUB_COORDINATOR
          }
          schools={data}
          supervisors={supervisors}
        />
      </div>
      <PageFooter />
    </div>
  );
}
