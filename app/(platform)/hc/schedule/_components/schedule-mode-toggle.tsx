import { ToggleGroup, ToggleGroupItem } from "#/components/ui/toggle-group";

import { useMode, type Mode } from "./mode-provider";

export function ScheduleModeToggle() {
  const { mode, setMode } = useMode();

  return (
    <ToggleGroup
      type="single"
      value={mode}
      onValueChange={(mode) => {
        if (mode) setMode(mode as Mode);
      }}
      className="gap-0 divide-x divide-gray-300 overflow-hidden rounded-xl border border-gray-300 py-0 shadow-sm"
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
      <ToggleGroupItem
        value="table"
        aria-label="Select table view"
        disabled
        className="rounded-none border-0 text-base"
      >
        Table
      </ToggleGroupItem>
      <ToggleGroupItem
        value="list"
        aria-label="Select list view"
        disabled
        className="rounded-none border-0 text-base"
      >
        List
      </ToggleGroupItem>
    </ToggleGroup>
  );
}
