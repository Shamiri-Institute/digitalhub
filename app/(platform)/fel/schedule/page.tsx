import { signOut } from "next-auth/react";
import { currentFellow } from "#/app/auth";

import { ScheduleCalendar } from "#/components/common/session/schedule-calendar";
import { ScheduleHeader } from "#/components/common/session/schedule-header";
import PageFooter from "#/components/ui/page-footer";
import { Separator } from "#/components/ui/separator";

export default async function FellowSchedulePage() {
  const fellow = await currentFellow();
  if (fellow === null) {
    await signOut({ callbackUrl: "/login" });
  }

  return (
    <div className="flex h-full w-full flex-col">
      <div className="container w-full grow bg-white py-10">
        <ScheduleHeader
          stats={[
            {
              title: "Sessions",
              count:
                fellow?.profile.groups.reduce(
                  (a, b) => a + b.school._count.interventionSessions,
                  0,
                ) || 0,
            },
            { title: "Groups", count: fellow?.profile.groups.length || 0 },
            {
              title: "Students",
              count: fellow?.profile.groups.reduce((a, b) => a + b._count.students, 0) || 0,
            },
          ]}
        />
        <Separator className="my-5 bg-[#E8E8E8]" />
        <ScheduleCalendar
          hubId={fellow?.profile.hubId!}
          aria-label="Session schedule"
          schools={fellow?.profile.hub?.schools ?? []}
          role={fellow?.session.user.activeMembership?.role!}
          hubSessionTypes={fellow?.profile.hub?.sessions}
          fellow={fellow}
        />
      </div>
      <PageFooter />
    </div>
  );
}
