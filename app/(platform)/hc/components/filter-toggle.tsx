"use client";

import type * as React from "react";
import type { Dispatch, SetStateAction } from "react";
import { Icons } from "#/components/icons";
import { Button } from "#/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";

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
  // TODO: Refactor this functionality for all users
  return (
    <div className="flex shrink-0 items-center gap-4">
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            disabled={true}
            className="flex items-center justify-center hover:bg-secondary hover:shadow-inner text-base"
          >
            <div className="flex items-center gap-2 text-shamiri-text-dark-grey hover:text-black">
              <span>Filter by</span>
              {/*To use later*/}
              {/*<div className="flex h-5 w-5 items-center justify-center rounded-full bg-shamiri-new-blue text-sm text-white">*/}
              {/*  3*/}
              {/*</div>*/}
              <Icons.chevronDown className="h-4 w-4" />
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className="max-h-[200px] overflow-y-scroll p-2 lg:max-h-none"
        >
          {children}
        </DropdownMenuContent>
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
