import { currentHubCoordinator } from "#/app/auth";
import { InvalidPersonnelRole } from "#/components/common/invalid-personnel-role";
import { Separator } from "#/components/ui/separator";

import { fetchSchoolData } from "#/app/(platform)/hc/schools/actions";
import { ScheduleCalendar } from "./_components/schedule-calendar";
import { ScheduleHeader } from "./_components/schedule-header";

export default async function HubCoordinatorSchedulePage() {
  const coordinator = await currentHubCoordinator();
  const schools = await fetchSchoolData(coordinator?.assignedHubId as string);

  if (!coordinator) {
    return <InvalidPersonnelRole role="hub-coordinator" />;
  }

  if (!coordinator.assignedHubId) {
    return <div>Hub coordinator has no assigned hub</div>;
  }

  return (
    <div className="container w-full bg-white py-10">
      <ScheduleHeader sessions={20} fellows={14} cases={23} />
      <Separator className="my-5 bg-[#E8E8E8]" />
      <ScheduleCalendar
        hubId={coordinator.assignedHubId}
        aria-label="Session schedule"
        schools={schools}
      />
    </div>
  );
}
