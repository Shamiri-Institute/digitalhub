import { currentFellow } from "#/app/auth";
import { Separator } from "#/components/ui/separator";

import { ScheduleCalendar } from "#/components/common/session/schedule-calendar";
import { ScheduleHeader } from "#/components/common/session/schedule-header";
import PageFooter from "#/components/ui/page-footer";
import { signOut } from "next-auth/react";

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
                fellow?.groups.reduce(
                  (a, b) => a + b.school._count.interventionSessions,
                  0,
                ) || 0,
            },
            { title: "Groups", count: fellow?.groups.length || 0 },
            {
              title: "Students",
              count:
                fellow?.groups.reduce((a, b) => a + b._count.students, 0) || 0,
            },
          ]}
        />
        <Separator className="my-5 bg-[#E8E8E8]" />
        <ScheduleCalendar
          hubId={fellow?.hubId!}
          aria-label="Session schedule"
          schools={fellow?.hub?.schools ?? []}
          role={fellow?.user.membership.role!}
          hubSessionTypes={fellow?.hub?.sessions}
          fellow={fellow}
        />
      </div>
      <PageFooter />
    </div>
  );
}
