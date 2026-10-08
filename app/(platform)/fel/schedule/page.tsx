import { redirect } from "next/navigation";
import { currentFellow } from "#/app/auth";

import { ScheduleCalendar } from "#/components/common/session/schedule-calendar";
import { ScheduleHeader } from "#/components/common/session/schedule-header";
import PageFooter from "#/components/ui/page-footer";
import { Separator } from "#/components/ui/separator";
import { getFellowGroupStats } from "#/lib/actions/fellow";
import { loadScheduleSessions, type ScheduleSearchParams } from "#/lib/schedule-sessions";

export default async function FellowSchedulePage({
  searchParams,
}: {
  searchParams: ScheduleSearchParams;
}) {
  const fellow = await currentFellow();
  if (fellow === null) {
    redirect("/login");
  }

  const role = fellow?.session.user.activeMembership?.role ?? "FELLOW";
  const [stats, schedule] = await Promise.all([
    getFellowGroupStats(),
    loadScheduleSessions(searchParams, role),
  ]);

  return (
    <div className="flex h-full w-full flex-col">
      <div className="container w-full grow bg-white py-10">
        <ScheduleHeader
          stats={[
            {
              title: "Sessions",
              count: stats?.total_sessions ?? 0,
            },
            { title: "Groups", count: stats?.group_count ?? 0 },
            {
              title: "Students",
              count: stats?.total_students ?? 0,
            },
          ]}
        />
        <Separator className="my-5 bg-[#E8E8E8]" />
        <ScheduleCalendar
          aria-label="Session schedule"
          sessions={schedule.sessions}
          timeZone={schedule.timeZone}
          role={role}
          fellowId={fellow?.profile.id}
        />
      </div>
      <PageFooter />
    </div>
  );
}
