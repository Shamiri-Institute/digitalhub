import { signOut } from "next-auth/react";
import { currentFellow } from "#/app/auth";

import { ScheduleCalendar } from "#/components/common/session/schedule-calendar";
import { ScheduleHeader } from "#/components/common/session/schedule-header";
import PageFooter from "#/components/ui/page-footer";
import { Separator } from "#/components/ui/separator";
import { getFellowGroupsAndHubData } from "#/lib/actions/fellow";

export default async function FellowSchedulePage() {
  const fellow = await currentFellow();
  if (fellow === null) {
    await signOut({ callbackUrl: "/login" });
  }

  const scheduleData = await getFellowGroupsAndHubData(fellow?.profile.id ?? "");

  return (
    <div className="flex h-full w-full flex-col">
      <div className="container w-full grow bg-white py-10">
        <ScheduleHeader
          stats={[
            {
              title: "Sessions",
              count: scheduleData?.stats.total_sessions ?? 0,
            },
            { title: "Groups", count: scheduleData?.stats.group_count ?? 0 },
            {
              title: "Students",
              count: scheduleData?.stats.total_students ?? 0,
            },
          ]}
        />
        <Separator className="my-5 bg-[#E8E8E8]" />
        <ScheduleCalendar
          hubId={fellow?.profile.hubId ?? ""}
          aria-label="Session schedule"
          schools={scheduleData?.hub?.schools ?? []}
          role={fellow?.session.user.activeMembership?.role ?? "FELLOW"}
          hubSessionTypes={scheduleData?.hub?.sessions}
          fellowId={fellow?.profile.id}
        />
      </div>
      <PageFooter />
    </div>
  );
}
