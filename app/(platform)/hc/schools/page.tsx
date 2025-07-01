import { signOut } from "next-auth/react";
import { currentHubCoordinator, getCurrentUser } from "#/app/auth";
import AssignPointSupervisor from "#/components/common/schools/assign-point-supervisor";
import { DropoutSchool } from "#/components/common/schools/dropout-school-form";
import SchoolDetailsForm from "#/components/common/schools/school-details-form";
import SchoolInfoProvider from "#/components/common/schools/school-info-provider";
import SchoolsDatatable from "#/components/common/schools/schools-datatable";
import { UndoDropoutSchool } from "#/components/common/schools/undo-dropout-school-form";
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
  if (!hubCoordinator?.assignedHubId) {
    return <div>Hub coordinator has no assigned hub</div>;
  }

  const user = await getCurrentUser();

  const [
    data,
    dropoutData,
    schoolDataCompletenessPercentage,
    sessionRatings,
    schoolAttendanceData,
    supervisors,
  ] = await Promise.all([
    await fetchSchoolData(hubCoordinator?.assignedHubId as string),
    await fetchDropoutReasons(hubCoordinator?.assignedHubId as string, queryAsSchoolId),
    await fetchSchoolDataCompletenessData(hubCoordinator?.assignedHubId as string, queryAsSchoolId),
    await fetchSessionRatingAverages(hubCoordinator?.assignedHubId as string, queryAsSchoolId),
    await fetchSchoolAttendances(hubCoordinator?.assignedHubId as string, queryAsSchoolId),
    await fetchHubSupervisors({
      where: {
        hubId: hubCoordinator?.assignedHubId as string,
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
              hubCoordinatorId={hubCoordinator?.id as string}
              hubId={hubCoordinator?.assignedHubId as string}
            />
            {/* TODO: dispaly options button */}
          </div>
        </div>
        <ChartArea
          dropoutData={dropoutData}
          schoolDataCompletenessData={schoolDataCompletenessPercentage}
          sessionRatingsData={sessionRatings}
          schoolAttendances={schoolAttendanceData}
        />
        <Separator />
        <SchoolInfoProvider>
          <SchoolsDatatable role={user?.membership.role!} />
          <SchoolDetailsForm />
          <AssignPointSupervisor supervisors={supervisors} />
          <DropoutSchool />
          <UndoDropoutSchool />
        </SchoolInfoProvider>
      </div>
      <PageFooter />
    </div>
  );
}
