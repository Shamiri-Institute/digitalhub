import AssignPointSupervisor from "#/app/(platform)/hc/schools/components/assign-point-supervisor";
import { DropoutSchool } from "#/app/(platform)/hc/schools/components/dropout-school-form";
import EditSchoolDetailsForm from "#/app/(platform)/hc/schools/components/edit-school-details-form";
import SchoolInfoProvider from "#/app/(platform)/hc/schools/components/school-info-provider";
import SchoolsDatatable from "#/app/(platform)/hc/schools/components/schools-datatable";
import SchoolsFilterToggle from "#/app/(platform)/hc/schools/components/schools-filter-toggle";
import { UndoDropoutSchool } from "#/app/(platform)/hc/schools/components/undo-dropout-school-form";
import { currentSupervisor } from "#/app/auth";
import { SearchCommand } from "#/components/search-command";
import { Separator } from "#/components/ui/separator";
import { redirect } from "next/navigation";
import SchoolsDataProvider from "../../hc/schools/components/schools-data-provider";
import {
  fetchDropoutReasons,
  fetchHubSupervisors,
  fetchSchoolAttendances,
  fetchSchoolData,
  fetchSchoolDataCompletenessData,
  fetchSessionRatingAverages,
} from "./actions";
import ChartArea from "./components/chart-area";

export default async function SchoolsPage() {
  const supervisor = await currentSupervisor();

  if (!supervisor) {
    redirect("/login");
  }

  // TODO: convert this to Promise.all for concurrent fetch
  const [
    data,
    dropoutData,
    schoolDataCompletenessPercentage,
    sessionRatings,
    schoolAttendanceData,
    supervisors,
    schoolData,
  ] = await Promise.all([
    fetchSchoolData(supervisor?.hubId as string),
    fetchDropoutReasons(supervisor?.hubId as string),
    fetchSchoolDataCompletenessData(supervisor?.hubId as string),
    fetchSessionRatingAverages(supervisor?.hubId as string),
    fetchSchoolAttendances(supervisor?.hubId as string),
    fetchHubSupervisors({
      where: {
        hubId: supervisor?.hubId as string,
      },
    }),
    fetchSchoolData(supervisor.hubId as string),
  ]);

  return (
    <SchoolsDataProvider schools={schoolData}>
      <div className="flex items-center justify-between">
        <div className="flex w-1/4 gap-3">
          <SearchCommand data={data} />
          <SchoolsFilterToggle schools={data} />
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
    </SchoolsDataProvider>
  );
}
