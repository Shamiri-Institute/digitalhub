import { currentHubCoordinator } from "#/app/auth";
import { Separator } from "#/components/ui/separator";

import { fetchSchoolData } from "#/app/(platform)/hc/schools/actions";
import PageFooter from "#/components/ui/page-footer";
import { db } from "#/lib/db";
import { signOut } from "next-auth/react";
import { ScheduleCalendar } from "./_components/schedule-calendar";
import { ScheduleHeader } from "./_components/schedule-header";

export default async function HubCoordinatorSchedulePage() {
  const coordinator = await currentHubCoordinator();
  if (coordinator === null) {
    await signOut({ callbackUrl: "/login" });
  }

  const schools = await fetchSchoolData(coordinator?.assignedHubId as string);
  const schoolStats = await db.$queryRaw<
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
        WHERE h.id='24P2_Hub_04'
    GROUP BY 
        h.id, h.hub_name`;

  if (!coordinator) {
    await signOut({ callbackUrl: "/login" });
  }

  if (!coordinator?.assignedHubId) {
    return <div>Hub coordinator has no assigned hub</div>;
  }

  console.log(schoolStats);
  return (
    <div className="flex h-full w-full flex-col">
      <div className="container w-full grow bg-white py-10">
        <ScheduleHeader
          sessions={Number(schoolStats[0]?.session_count) || 0}
          fellows={Number(schoolStats[0]?.fellow_count) || 0}
          cases={Number(schoolStats[0]?.clinical_case_count) || 0}
        />
        <Separator className="my-5 bg-[#E8E8E8]" />
        <ScheduleCalendar
          hubId={coordinator.assignedHubId}
          aria-label="Session schedule"
          schools={schools}
        />
      </div>
      <PageFooter />
    </div>
  );
}
