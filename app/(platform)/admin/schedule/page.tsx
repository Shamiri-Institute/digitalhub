import { redirect } from "next/navigation";
import { ImplementerRole } from "#/db/enums";

import { currentAdminUser } from "#/app/auth";
import PageFooter from "#/components/ui/page-footer";
import { Separator } from "#/components/ui/separator";
import { fetchImplementerFellowRatings, fetchImplementerStats } from "#/lib/actions/implementer";
import { loadScheduleSessions, type ScheduleSearchParams } from "#/lib/schedule-sessions";
import { ScheduleCalendar } from "../../../../components/common/session/schedule-calendar";
import { ScheduleHeader } from "../../../../components/common/session/schedule-header";

export default async function AdminSchedulePage({
  searchParams,
}: {
  searchParams: ScheduleSearchParams;
}) {
  const admin = await currentAdminUser();
  if (admin === null) {
    redirect("/login");
  }
  const role = admin?.session.user.activeMembership?.role ?? ImplementerRole.ADMIN;
  const schedule = await loadScheduleSessions(searchParams, role);
  const [fellowRatings, stats] = await Promise.all([
    fetchImplementerFellowRatings(),
    fetchImplementerStats(),
  ]);

  return (
    <div className="flex h-full w-full flex-col">
      <div className="container w-full grow bg-white py-10">
        <ScheduleHeader
          stats={[
            { title: "Hubs", count: stats.hub_count },
            { title: "Schools", count: stats.school_count },
            { title: "Students", count: stats.student_count },
          ]}
        />
        <Separator className="my-5 bg-[#E8E8E8]" />
        <ScheduleCalendar
          aria-label="Session schedule"
          sessions={schedule.sessions}
          timeZone={schedule.timeZone}
          fellowRatings={fellowRatings.data ?? []}
          role={role}
        />
      </div>
      <PageFooter />
    </div>
  );
}
