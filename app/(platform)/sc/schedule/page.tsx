import { signOut } from "next-auth/react";
import { currentSupervisorLite } from "#/app/auth";
import { ScheduleCalendar } from "#/components/common/session/schedule-calendar";
import { ScheduleHeader } from "#/components/common/session/schedule-header";
import PageFooter from "#/components/ui/page-footer";
import { Separator } from "#/components/ui/separator";
import { db } from "#/db/client";
import { getHubScheduleStats } from "#/lib/actions/hub";
import { fetchHubFellowRatings, fetchScheduleSupervisors } from "#/lib/actions/schedule-data";

export default async function SupervisorSchedulePage() {
  const supervisor = await currentSupervisorLite();
  if (supervisor === null) {
    await signOut({ callbackUrl: "/login" });
  }

  const hubId = supervisor?.profile.hubId as string;

  const [schools, stats, supervisors, fellowRatings, hubSessionTypes] = await Promise.all([
    db.query.school.findMany({ where: (s, { eq }) => eq(s.hubId, hubId) }),
    getHubScheduleStats(hubId),
    fetchScheduleSupervisors(hubId),
    fetchHubFellowRatings(hubId),
    db.query.sessionName.findMany({ where: (s, { eq }) => eq(s.hubId, hubId) }),
  ]);

  return (
    <div className="flex h-full w-full flex-col">
      <div className="container w-full grow bg-white py-10">
        <ScheduleHeader
          stats={[
            {
              title: "Sessions",
              count: stats.sessionCount,
            },
            {
              title: "Fellows",
              count: stats.fellowCount,
            },
            {
              title: "Cases",
              count: stats.clinicalCaseCount,
            },
          ]}
        />
        <Separator className="my-5 bg-[#E8E8E8]" />
        <ScheduleCalendar
          hubId={supervisor?.profile.hubId ?? ""}
          aria-label="Session schedule"
          schools={schools}
          supervisors={supervisors}
          fellowRatings={fellowRatings.map((rating) => ({
            ...rating,
            averageRating: Number(rating.averageRating),
          }))}
          role={supervisor?.session.user.activeMembership?.role ?? "SUPERVISOR"}
          supervisorId={supervisor?.profile.id}
          hubSessionTypes={hubSessionTypes}
        />
      </div>
      <PageFooter />
    </div>
  );
}
