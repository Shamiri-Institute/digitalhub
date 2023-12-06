"use client";

import { CaretSortIcon } from "@radix-ui/react-icons";

import type { CurrentSupervisor } from "#/app/auth";
import { Button } from "#/components/ui/button";

export function FellowSwitcher({
  open,
  fellowId,
  setFellowId,
  fellows,
}: {
  open: boolean;
  fellowId: string | null;
  setFellowId: (fid: string) => void;
  fellows: NonNullable<CurrentSupervisor>["fellows"];
}) {
  return (
    <Button
      variant="outline"
      role="combobox"
      aria-expanded={open}
      className="w-full justify-between px-2"
    >
      <span className="text-left">Select Fellow</span>
      <CaretSortIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
    </Button>
  );
}
