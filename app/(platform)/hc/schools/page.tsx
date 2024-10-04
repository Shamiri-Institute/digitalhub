import AssignPointSupervisor from "#/app/(platform)/hc/schools/components/assign-point-supervisor";
import { DropoutSchool } from "#/app/(platform)/hc/schools/components/dropout-school-form";
import EditSchoolDetailsForm from "#/app/(platform)/hc/schools/components/edit-school-details-form";
import SchoolInfoProvider from "#/app/(platform)/hc/schools/components/school-info-provider";
import SchoolsDatatable from "#/app/(platform)/hc/schools/components/schools-datatable";
import SchoolsFilterToggle from "#/app/(platform)/hc/schools/components/schools-filter-toggle";
import { SearchCommand } from "#/components/search-command";
import { UndoDropoutSchool } from "#/app/(platform)/hc/schools/components/undo-dropout-school-form";
import { currentHubCoordinator } from "#/app/auth";
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

export default async function SchoolsPage() {
  const hubCoordinator = await currentHubCoordinator();
  // TODO: convert this to Promise.all for concurrent fetch
  const data = await fetchSchoolData(hubCoordinator?.assignedHubId as string);
  const dropoutData = await fetchDropoutReasons(
    hubCoordinator?.assignedHubId as string,
  );
  const schoolDataCompletenessPercentage =
    await fetchSchoolDataCompletenessData(
      hubCoordinator?.assignedHubId as string,
    );

  const sessionRatings = await fetchSessionRatingAverages(
    hubCoordinator?.assignedHubId as string,
  );

  const schoolAttendanceData = await fetchSchoolAttendances(
    hubCoordinator?.assignedHubId as string,
  );

  const supervisors = await fetchHubSupervisors({
    where: {
      hubId: hubCoordinator?.assignedHubId as string,
    },
  });

  return (
    <div className="flex h-full flex-col">
      <div className="container w-full grow space-y-3 py-10">
        <PageHeading title="Schools" />
        <Separator />
        <div className="flex items-center justify-between">
          <div className="flex w-1/4 gap-3">
            <SearchCommand data={data} />
            <SchoolsFilterToggle schools={data} />
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
          <SchoolsDatatable />
          <EditSchoolDetailsForm />
          <AssignPointSupervisor supervisors={supervisors} />
          <DropoutSchool />
          <UndoDropoutSchool />
        </SchoolInfoProvider>
      </div>
      <PageFooter />
    </div>
  );
}
