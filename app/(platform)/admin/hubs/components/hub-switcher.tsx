"use client";

import { Check } from "lucide-react";
import Link from "next/link";
import type * as React from "react";
import {
  Command,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "#/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "#/components/ui/popover";
import { cn } from "#/lib/utils";
import type { SiblingHub } from "../queries";

export function HubSwitcher({
  trigger,
  hubs,
  currentHub,
  hubPath,
}: {
  trigger: React.ReactElement;
  hubs: SiblingHub[];
  currentHub: SiblingHub;
  hubPath: (hubId: string) => string;
}) {
  return (
    <Popover>
      <PopoverTrigger render={trigger} />
      <PopoverContent className="w-full p-0" align="start">
        <Command
          defaultValue={currentHub.hubName}
          // cmdk's Enter runs onSelect, not a click; click the link so the leave guard can stop it.
          onKeyDown={(event) => {
            if (event.key !== "Enter") return;
            const selected = event.currentTarget.querySelector<HTMLElement>(
              '[cmdk-item][aria-selected="true"]',
            );
            if (!selected) return;
            event.preventDefault();
            selected.click();
          }}
        >
          <span className="px-4 pb-1 pt-2 text-xs uppercase tracking-widest text-muted-foreground">
            switch hub
          </span>
          <CommandSeparator />
          <CommandInput placeholder="Search hubs..." className="h-9" />
          <CommandList className="max-h-[300px] overflow-y-scroll">
            {hubs.map((h) => (
              <CommandItem
                key={h.id}
                value={h.hubName}
                asChild
                className="flex items-center justify-between gap-3 rounded-none border-b border-border px-3 last:border-b-0"
              >
                <Link href={hubPath(h.id)}>
                  <span className="font-medium">{h.hubName}</span>
                  <Check
                    className={cn("h-4 w-4", h.id === currentHub.id ? "opacity-100" : "opacity-0")}
                  />
                </Link>
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
