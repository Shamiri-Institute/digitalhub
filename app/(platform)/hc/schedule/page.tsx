import { currentHubCoordinator } from "#/app/auth";
import { InvalidPersonnelRole } from "#/components/common/invalid-personnel-role";
import { Separator } from "#/components/ui/separator";
import { db } from "#/lib/db";

import { ScheduleCalendar } from "./_components/schedule-calendar";
import { ScheduleHeader } from "./_components/schedule-header";

export default async function HubCoordinatorSchedulePage() {
  const coordinator = await currentHubCoordinator();
  if (!coordinator) {
    return <InvalidPersonnelRole role="hub-coordinator" />;
  }

  if (!coordinator.assignedHubId) {
    return <div>Hub cooridnator has no assigned hub</div>;
  }

  const sessions = await db.interventionSession.findMany({
    where: {
      school: {
        hubId: coordinator.assignedHubId,
      },
    },
    include: {
      school: true,
    },
  });

  return (
    <main className="max-w-[90rem] px-[24px] pb-[24px] pt-[20px]">
      <ScheduleHeader sessions={20} fellows={14} cases={23} />
      <Separator className="my-5 bg-[#E8E8E8]" />
      <ScheduleCalendar sessions={sessions} aria-label="Session schedule" />
    </main>
  );
}
