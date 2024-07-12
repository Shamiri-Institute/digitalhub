import EditSchoolDetailsForm from "#/app/(platform)/hc/schools/components/edit-school-details-form";
import SchoolInfoProvider from "#/app/(platform)/hc/schools/components/school-info-provider";
import SchoolsFilterToggle from "#/app/(platform)/hc/schools/components/schools-filter-toggle";
import { SearchCommand } from "#/app/(platform)/hc/schools/components/search-command";
import { currentHubCoordinator } from "#/app/auth";
import PageHeading from "#/components/ui/page-heading";
import { Separator } from "#/components/ui/separator";
import SchoolsDataTable from "../components/data-table";
import {
  fetchDropoutReasons,
  fetchSchoolAttendances,
  fetchSchoolData,
  fetchSchoolDataCompletenessData,
  fetchSessionRatingAverages,
} from "./actions";
import ChartArea from "./components/chart-area";
import { columns } from "./components/columns";
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

  return (
    <div className="container w-full space-y-5 py-10">
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
      <div className="pt-5">
        <SchoolInfoProvider>
          <SchoolsDataTable
            data={data}
            columns={columns}
            emptyStateMessage="No schools found for this hub"
            className={"data-table mt-4 bg-white"}
            columnVisibilityState={{
              "School ID": false,
              "Sub - county": false,
              "Point teacher": false,
              "Point teacher phone no.": false,
              "Point teacher email": false,
              "Point supervisor phone no.": false,
              "Point supervisor email": false,
            }}
          />
          <EditSchoolDetailsForm />
        </SchoolInfoProvider>
      </div>
    </div>
  );
}
