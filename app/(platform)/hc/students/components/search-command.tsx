"use client";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "#/components/ui/command";
import type { Prisma } from "@prisma/client";
import { MagnifyingGlassIcon } from "@radix-ui/react-icons";
import { useState } from "react";

export function StudentSearchCommand({
  data,
}: {
  data: Prisma.StudentGetPayload<{}>[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex-1 shrink-0">
      <div
        className="flex w-full cursor-pointer items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-1.5 hover:bg-secondary hover:shadow-inner"
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
          <CommandEmpty>No students found</CommandEmpty>
          <CommandGroup heading={"Students"}>
            {data
              .map((student) => student.studentName)
              .map((sch) => (
                <CommandItem key={sch}>{sch}</CommandItem>
              ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </div>
  );
}
