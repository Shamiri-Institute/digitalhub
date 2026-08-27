import { ImplementerRole } from "@prisma/client";
import { redirect } from "next/navigation";
import CountWidget from "#/app/(platform)/hc/components/count-widget";
import { fetchHubSupervisors, fetchSchoolData } from "#/app/(platform)/hc/schools/actions";
import { currentSupervisor } from "#/app/auth";
import SchoolsDatatable from "#/components/common/schools/schools-datatable";
import PageFooter from "#/components/ui/page-footer";
import PageHeading from "#/components/ui/page-heading";
import { Separator } from "#/components/ui/separator";
import { getHubScheduleStats } from "#/lib/actions/hub";

export default async function SchoolsPage() {
  const supervisor = await currentSupervisor();

  if (!supervisor) {
    redirect("/login");
  }
  const hubId = supervisor?.profile?.hubId;
  if (!hubId) {
    return <div>Supervisor has no assigned hub</div>;
  }

  const [data, supervisors, schoolsStats] = await Promise.all([
    fetchSchoolData(hubId),
    fetchHubSupervisors({
      where: {
        hubId: supervisor?.profile?.hubId,
      },
    }),
    getHubScheduleStats(hubId),
  ]);

  return (
    <div className="flex h-full flex-col">
      <div className="container w-full grow space-y-3 py-10">
        <div className="flex items-center justify-between">
          <PageHeading title="Schools" />
          <CountWidget
            stats={[
              {
                title: "Sessions",
                count: schoolsStats.sessionCount,
              },
              {
                title: "Fellows",
                count: schoolsStats.fellowCount,
              },
              {
                title: "Cases",
                count: schoolsStats.clinicalCaseCount,
              },
            ]}
          />
        </div>
        <Separator />
        {/*TODO: Add search and filter features*/}
        {/*<div className="flex items-center justify-between">*/}
        {/*  <div className="flex w-1/4 items-start gap-3">*/}
        {/*    <SearchCommand data={data} />*/}
        {/*    <SchoolsFilterToggle schools={data} />*/}
        {/*  </div>*/}
        {/*</div>*/}
        <SchoolsDatatable
          role={supervisor?.session?.user.activeMembership?.role ?? ImplementerRole.SUPERVISOR}
          schools={data}
          supervisors={supervisors}
        />
      </div>
      <PageFooter />
    </div>
  );
}
