"use client";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "#/components/ui/command";
import { Prisma } from "@prisma/client";
import { MagnifyingGlassIcon } from "@radix-ui/react-icons";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export function SearchCommand({
  data,
}: {
  data: Prisma.SchoolGetPayload<{
    include: {
      assignedSupervisor: true;
      interventionSessions: {
        include: {
          sessionRatings: true;
        };
      };
      students: {
        include: {
          assignedGroup: true;
          _count: {
            select: {
              clinicalCases: true;
            };
          };
        };
      };
    };
  }>[];
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const pathname = usePathname();
  const { replace } = useRouter();
  const searchParams = useSearchParams();

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
        <span className="select-none">{selected ?? "Search"}</span>
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
              .map((school) => school)
              .map((sch) => (
                <CommandItem
                  key={sch.id}
                  onSelect={() => {
                    setSelected(sch.schoolName);
                    const params = new URLSearchParams(searchParams);
                    if (sch) {
                      params.set("query", sch.id);
                    } else {
                      params.delete("query");
                    }
                    replace(`${pathname}?${params.toString()}`);
                    setOpen(false);
                  }}
                >
                  {sch.schoolName}
                </CommandItem>
              ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </div>
  );
}
