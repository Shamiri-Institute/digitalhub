import { redirect } from "next/navigation";
import CountWidget from "#/app/(platform)/hc/components/count-widget";
import { currentSupervisor } from "#/app/auth";
import SchoolsDatatable from "#/components/common/schools/schools-datatable";
import PageFooter from "#/components/ui/page-footer";
import PageHeading from "#/components/ui/page-heading";
import { Separator } from "#/components/ui/separator";
import { db } from "#/lib/db";
import { fetchHubSupervisors, fetchSchoolData } from "./actions";
import { ImplementerRole } from "@prisma/client";

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
    await fetchSchoolData(supervisor?.profile?.hubId!),
    await fetchHubSupervisors({
      where: {
        hubId: supervisor?.profile?.hubId,
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
        WHERE h.id=${supervisor?.profile?.hubId}
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
