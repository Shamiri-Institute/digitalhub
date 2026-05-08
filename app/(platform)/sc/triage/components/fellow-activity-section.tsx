import type { TriageEventForSupervisor } from "#/app/(platform)/sc/triage/action";
import FellowActivityTable from "#/app/(platform)/sc/triage/components/fellow-activity-table";

export default function FellowActivitySection({
  events,
  supervisorId,
}: {
  events: TriageEventForSupervisor[];
  supervisorId: string;
}) {
  const activityEvents = events.filter((e) => e.fellow.supervisorId === supervisorId);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <h2 className="text-base font-semibold">My fellows&apos; activity</h2>
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-shamiri-text-grey">
          {activityEvents.length}
        </span>
      </div>
      <p className="text-sm text-shamiri-text-grey">
        All triage events logged by your assigned fellows. Read-only — expand a fellow row to see
        individual events.
      </p>
      <FellowActivityTable events={activityEvents} supervisorId={supervisorId} />
    </div>
  );
}
