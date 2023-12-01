"use client";

import { CaretSortIcon, CheckIcon } from "@radix-ui/react-icons";
import * as React from "react";

import { Button } from "#/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "#/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "#/components/ui/popover";
import { cn } from "#/lib/utils";

type Personnel = {
  id: string;
  type: "supervisor" | "hc";
  label: string;
};

export function PersonnelSwitcher({ personnel }: { personnel: Personnel[] }) {
  const [open, setOpen] = React.useState(false);
  const [selectedPersonnelId, setSelectedPersonnelId] = React.useState("hc3");

  return (
    <div className="rounded-md border border-zinc-200/60 bg-zinc-50 bg-gradient-to-br from-zinc-50 to-white px-1.5 py-3">
      <div className="ml-2 text-xs font-medium uppercase tracking-wider text-zinc-700">
        Switch Supervisor or HC
      </div>
      <div className="mt-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="base"
              role="combobox"
              aria-expanded={open}
              className="w-full justify-between px-2"
            >
              {selectedPersonnelId
                ? personnel.find(
                    (personnel) => personnel.id === selectedPersonnelId,
                  )?.label
                : "Select personnel..."}
              <CaretSortIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[200px] p-0 md:w-56 lg:w-64">
            <Command>
              <CommandInput placeholder="Search personnel..." className="h-9" />
              <CommandEmpty>No framework found.</CommandEmpty>
              <CommandGroup>
                {personnel.map((person) => (
                  <CommandItem
                    key={person.id}
                    value={person.id}
                    onSelect={(currentValue) => {
                      setSelectedPersonnelId(
                        currentValue === selectedPersonnelId
                          ? ""
                          : currentValue,
                      );
                      setOpen(false);
                    }}
                  >
                    {person.label}
                    <CheckIcon
                      className={cn(
                        "ml-auto h-4 w-4",
                        selectedPersonnelId === person.id
                          ? "opacity-100"
                          : "opacity-0",
                      )}
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
