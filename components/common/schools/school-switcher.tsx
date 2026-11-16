"use client";

import { Check } from "lucide-react";
import type * as React from "react";
import {
  Command,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "#/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "#/components/ui/popover";
import type { BreadcrumbSchool } from "#/components/common/schools/school-view-layout";
import { cn } from "#/lib/utils";

export function SchoolSwitcher({
  trigger,
  schools,
  selectedVisibleId,
  onSelect,
}: {
  trigger: React.ReactElement;
  schools: BreadcrumbSchool[];
  selectedVisibleId: string | undefined;
  onSelect: (schoolVisibleId: string) => void;
}) {
  return (
    <Popover>
      <PopoverTrigger render={trigger} />
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <span className="px-4 pb-1 pt-2 text-xs uppercase tracking-widest text-muted-foreground">
            switch school
          </span>
          <CommandSeparator />
          <CommandInput placeholder="Search schools..." className="h-9" />
          <CommandList className="max-h-[300px] overflow-y-scroll">
            {schools.map((school) => (
              <CommandItem
                key={school.visibleId}
                value={school.schoolName}
                onSelect={() => onSelect(school.visibleId)}
                className="flex items-center justify-between gap-3 rounded-none border-b border-border px-3 last:border-b-0"
              >
                <div className="flex flex-col">
                  <span className="font-medium">{school.schoolName}</span>
                  <span className="text-xs uppercase tracking-widest text-muted-foreground text-primary">
                    {school.hub?.hubName ?? "No Hub"}
                  </span>
                </div>
                <Check
                  className={cn(
                    "h-4 w-4",
                    selectedVisibleId === school.visibleId ? "opacity-100" : "opacity-0",
                  )}
                />
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
