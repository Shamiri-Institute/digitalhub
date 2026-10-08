import { redirect } from "next/navigation";
import { currentHubCoordinator } from "#/app/auth";
import PageFooter from "#/components/ui/page-footer";
import { Separator } from "#/components/ui/separator";
import { getHubScheduleStats } from "#/lib/actions/hub";
import {
  fetchHubFellowRatings,
  fetchScheduleSchools,
  fetchScheduleSessionTypes,
  fetchScheduleSupervisors,
} from "#/lib/actions/schedule-data";
import { loadScheduleSessions, type ScheduleSearchParams } from "#/lib/schedule-sessions";
import { ScheduleCalendar } from "../../../../components/common/session/schedule-calendar";
import { ScheduleHeader } from "../../../../components/common/session/schedule-header";

export default async function HubCoordinatorSchedulePage({
  searchParams,
}: {
  searchParams: ScheduleSearchParams;
}) {
  const coordinator = await currentHubCoordinator();
  if (coordinator === null) {
    redirect("/login");
  }
  if (!coordinator?.profile?.assignedHubId) {
    return <div>Hub coordinator has no assigned hub</div>;
  }
  const hubId = coordinator.profile.assignedHubId;
  const role = coordinator.session.user.activeMembership?.role ?? "HUB_COORDINATOR";

  const schedule = await loadScheduleSessions(searchParams, role);
  const [schools, schoolStats, supervisors, fellowRatings, hubSessionTypes] = await Promise.all([
    fetchScheduleSchools(hubId),
    getHubScheduleStats(hubId),
    fetchScheduleSupervisors(schedule.hubIds, schedule.sessionsWhere),
    fetchHubFellowRatings(hubId),
    fetchScheduleSessionTypes(hubId),
  ]);

  return (
    <div className="flex h-full w-full flex-col">
      <div className="container w-full grow bg-white py-10">
        <ScheduleHeader
          stats={[
            {
              title: "Sessions",
              count: schoolStats.sessionCount,
            },
            {
              title: "Fellows",
              count: schoolStats.fellowCount,
            },
            {
              title: "Cases",
              count: schoolStats.clinicalCaseCount,
            },
          ]}
        />
        <Separator className="my-5 bg-[#E8E8E8]" />
        <ScheduleCalendar
          aria-label="Session schedule"
          sessions={schedule.sessions}
          timeZone={schedule.timeZone}
          schools={schools}
          supervisors={supervisors}
          fellowRatings={fellowRatings.map((rating) => ({
            ...rating,
            averageRating: Number(rating.averageRating),
          }))}
          role={role}
          hubSessionTypes={hubSessionTypes}
        />
      </div>
      <PageFooter />
    </div>
  );
}
