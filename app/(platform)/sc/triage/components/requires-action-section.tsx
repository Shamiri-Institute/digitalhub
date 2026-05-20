import type { TriageEventForSupervisor } from "#/app/(platform)/sc/triage/action";
import RequiresActionTable from "#/app/(platform)/sc/triage/components/requires-action-table";

export default function RequiresActionSection({ events }: { events: TriageEventForSupervisor[] }) {
  const actionEvents = events.filter(
    (e): e is typeof e & { viewSection: "requires_action" } => e.viewSection === "requires_action",
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <h2 className="text-base font-semibold">Requires my action</h2>
        {actionEvents.length > 0 && (
          <span className="rounded-full bg-red-bg px-2 py-0.5 text-xs font-semibold text-red-base">
            {actionEvents.length}
          </span>
        )}
      </div>
      <p className="text-sm text-shamiri-text-grey">
        Escalations referred to you with no open clinical case. Each item needs a response.
      </p>
      <RequiresActionTable events={actionEvents} />
    </div>
  );
}
