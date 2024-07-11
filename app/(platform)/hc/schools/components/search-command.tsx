"use client";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "#/components/ui/command";
import { MagnifyingGlassIcon } from "@radix-ui/react-icons";
import { useState } from "react";

export function SearchCommand({ data }: { data: any[] }) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <div
        className="flex w-32 cursor-pointer items-center gap-2 rounded-lg border bg-white px-4 py-1.5 hover:drop-shadow"
        onClick={() => {
          if (!open) {
            setOpen(true);
          }
        }}
      >
        <MagnifyingGlassIcon className="h-4 w-4 shrink-0 opacity-50" />
        <span className="select-none">Search</span>
      </div>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Search"
          className="h-auto min-w-full rounded-lg bg-white px-3 py-1.5 text-base"
        />
        <CommandList>
          <CommandEmpty>No schools found</CommandEmpty>
          <CommandGroup heading={"Schools"}>
            {data
              .map((school) => school.schoolName)
              .map((sch) => (
                <CommandItem key={sch}>{sch}</CommandItem>
              ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </div>
  );
}
