import type { ImplementerRole } from "#/db/enums";
import { ToggleGroup, ToggleGroupItem } from "#/components/ui/toggle-group";
import type { Mode } from "#/lib/schedule-view";

export function ScheduleModeToggle({
  role,
  mode,
  onModeChange,
}: {
  role: ImplementerRole;
  mode: Mode;
  onModeChange: (mode: Mode) => void;
}) {
  return (
    <ToggleGroup
      type="single"
      value={mode}
      onValueChange={(nextMode) => {
        if (nextMode) onModeChange(nextMode as Mode);
      }}
      className="gap-0 divide-x divide-gray-300 overflow-hidden rounded-lg border border-gray-300 py-0 shadow-xs"
    >
      <ToggleGroupItem
        value="day"
        aria-label="Select day view"
        className="rounded-none border-0 text-base"
      >
        Day
      </ToggleGroupItem>
      <ToggleGroupItem
        value="week"
        aria-label="Select week view"
        className="rounded-none border-0 text-base"
      >
        Week
      </ToggleGroupItem>
      <ToggleGroupItem
        value="month"
        aria-label="Select month view"
        className="rounded-none border-0 text-base"
      >
        Month
      </ToggleGroupItem>
      {role === "HUB_COORDINATOR" && (
        <ToggleGroupItem
          value="table"
          aria-label="Select table view"
          className="rounded-none border-0 text-base"
        >
          Table
        </ToggleGroupItem>
      )}
      <ToggleGroupItem
        value="list"
        aria-label="Select list view"
        className="rounded-none border-0 text-base"
      >
        List
      </ToggleGroupItem>
    </ToggleGroup>
  );
}
