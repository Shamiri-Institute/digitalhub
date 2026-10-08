import { redirect } from "next/navigation";
import { ImplementerRole } from "#/db/enums";

import { currentAdminUser } from "#/app/auth";
import PageFooter from "#/components/ui/page-footer";
import { Separator } from "#/components/ui/separator";
import { fetchImplementerFellowRatings } from "#/lib/actions/implementer";
import { fetchScheduleSupervisors } from "#/lib/actions/schedule-data";
import { loadScheduleSessions, type ScheduleSearchParams } from "#/lib/schedule-sessions";
import { ScheduleCalendar } from "../../../../components/common/session/schedule-calendar";
import { AdminScheduleHeader } from "../../../../components/common/session/admin-schedule-header";

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
  const [supervisors, fellowRatings] = await Promise.all([
    fetchScheduleSupervisors(schedule.hubIds, schedule.sessionsWhere),
    fetchImplementerFellowRatings(),
  ]);

  return (
    <div className="flex h-full w-full flex-col">
      <div className="container w-full grow bg-white py-10">
        <AdminScheduleHeader adminUser={admin} />
        <Separator className="my-5 bg-[#E8E8E8]" />
        <ScheduleCalendar
          aria-label="Session schedule"
          sessions={schedule.sessions}
          timeZone={schedule.timeZone}
          supervisors={supervisors}
          fellowRatings={fellowRatings.data ?? []}
          role={role}
        />
      </div>
      <PageFooter />
    </div>
  );
}
