import CountWidget from "#/app/(platform)/hc/components/count-widget";
import { currentSupervisor, getCurrentUser } from "#/app/auth";
import AssignPointSupervisor from "#/components/common/schools/assign-point-supervisor";
import { DropoutSchool } from "#/components/common/schools/dropout-school-form";
import EditSchoolDetailsForm from "#/components/common/schools/edit-school-details-form";
import SchoolInfoProvider from "#/components/common/schools/school-info-provider";
import SchoolsDatatable from "#/components/common/schools/schools-datatable";
import { UndoDropoutSchool } from "#/components/common/schools/undo-dropout-school-form";
import PageFooter from "#/components/ui/page-footer";
import PageHeading from "#/components/ui/page-heading";
import { Separator } from "#/components/ui/separator";
import { db } from "#/lib/db";
import { redirect } from "next/navigation";
import { fetchHubSupervisors } from "./actions";

export default async function SchoolsPage() {
  const supervisor = await currentSupervisor();

  if (!supervisor) {
    redirect("/login");
  }

  const user = await getCurrentUser();
  const [supervisors, schoolsStats] = await Promise.all([
    fetchHubSupervisors({
      where: {
        hubId: supervisor?.hubId as string,
      },
    }),
    await db.$queryRaw<
      {
        session_count: number;
        clinical_case_count: number;
        fellow_count: number;
      }[]
    >`SELECT 
    h.id,
    COUNT(DISTINCT s.id) AS session_count,
    COUNT(DISTINCT c.id) AS clinical_case_count,
    COUNT(DISTINCT f.id) AS fellow_count
    FROM 
        hubs h
    JOIN 
        schools sch ON h.id = sch.hub_id
    LEFT JOIN 
        intervention_sessions s ON sch.id = s.school_id
    LEFT JOIN 
        students c ON sch.id = c.school_id AND c.is_clinical_case=TRUE
    LEFT JOIN 
        fellows f ON h.id = f.hub_id
        WHERE h.id=${supervisor!.hubId}
    GROUP BY 
        h.id, h.hub_name`,
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
                count: Number(schoolsStats[0]?.session_count) || 0,
              },
              {
                title: "Fellows",
                count: Number(schoolsStats[0]?.fellow_count) || 0,
              },
              {
                title: "Cases",
                count: Number(schoolsStats[0]?.clinical_case_count) || 0,
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
        <SchoolInfoProvider>
          <SchoolsDatatable role={supervisor.user.membership.role} />
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
