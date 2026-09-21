import { signOut } from "next-auth/react";
import { fetchSchoolData } from "#/app/(platform)/hc/schools/actions";
import { currentHubCoordinator } from "#/app/auth";
import PageFooter from "#/components/ui/page-footer";
import { Separator } from "#/components/ui/separator";
import { db } from "#/db/client";
import { getHubScheduleStats } from "#/lib/actions/hub";
import { fetchHubFellowRatings, fetchScheduleSupervisors } from "#/lib/actions/schedule-data";
import { ScheduleCalendar } from "../../../../components/common/session/schedule-calendar";
import { ScheduleHeader } from "../../../../components/common/session/schedule-header";

export default async function HubCoordinatorSchedulePage() {
  const coordinator = await currentHubCoordinator();
  if (coordinator === null) {
    await signOut({ callbackUrl: "/login" });
  }
  if (!coordinator?.profile?.assignedHubId) {
    return <div>Hub coordinator has no assigned hub</div>;
  }
  const hubId = coordinator.profile.assignedHubId;

  const values = await Promise.all([
    fetchSchoolData(hubId),
    getHubScheduleStats(hubId),
    fetchScheduleSupervisors(hubId),
    fetchHubFellowRatings(hubId),
    db.query.sessionName.findMany({ where: (s, { eq }) => eq(s.hubId, hubId) }),
  ]);
  const schools = values[0];
  const schoolStats = values[1];
  const supervisors = values[2];
  const fellowRatings = values[3];
  const hubSessionTypes = values[4];

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
          hubId={hubId}
          aria-label="Session schedule"
          schools={schools}
          supervisors={supervisors}
          fellowRatings={fellowRatings.map((rating) => ({
            ...rating,
            averageRating: Number(rating.averageRating),
          }))}
          role={coordinator?.session.user.activeMembership?.role ?? "HUB_COORDINATOR"}
          hubSessionTypes={hubSessionTypes}
        />
      </div>
      <PageFooter />
    </div>
  );
}
