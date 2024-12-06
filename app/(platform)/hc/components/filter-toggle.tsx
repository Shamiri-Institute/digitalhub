"use client";

import { Icons } from "#/components/icons";
import { Button } from "#/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuPortal,
  DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import * as React from "react";
import { Dispatch, SetStateAction } from "react";

export default function FilterToggle({
  children,
  filterIsActive,
  setDefaultFilters,
  open,
  setOpen,
}: {
  children: React.ReactNode;
  filterIsActive: boolean;
  setDefaultFilters: () => void;
  open: boolean;
  setOpen: Dispatch<SetStateAction<boolean>>;
}) {
  return (
    <div className="flex shrink-0 items-center gap-4">
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <div className="flex cursor-pointer select-none items-center justify-center rounded-lg border border-gray-300 bg-white py-1.5 pl-3 pr-2 ring-0 hover:bg-secondary hover:shadow-inner">
            <div className="flex items-center gap-2 text-shamiri-text-dark-grey hover:text-black">
              <span>Filter by</span>
              {/*To use later*/}
              {/*<div className="flex h-5 w-5 items-center justify-center rounded-full bg-shamiri-new-blue text-sm text-white">*/}
              {/*  3*/}
              {/*</div>*/}
              <Icons.chevronDown className="h-4 w-4" />
            </div>
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuPortal>
          <DropdownMenuContent className="p-2">{children}</DropdownMenuContent>
        </DropdownMenuPortal>
      </DropdownMenu>
      {filterIsActive && (
        <Button
          variant={"ghost"}
          className="text-shamiri-new-blue hover:bg-blue-bg hover:text-shamiri-new-blue"
          onClick={() => {
            setDefaultFilters();
          }}
        >
          Clear all filters
        </Button>
      )}
    </div>
  );
}
