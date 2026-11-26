"use client";

import type { ComponentProps } from "react";
import { Icons } from "#/components/icons";
import { DropdownMenuItem, DropdownMenuTrigger } from "#/components/ui/dropdown-menu";
import { cn } from "#/lib/utils";

export function RowActionsTrigger({ label, className }: { label: string; className?: string }) {
  return (
    <DropdownMenuTrigger
      aria-label={label}
      className={cn(
        "absolute inset-0 flex items-center justify-center border-l focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-shamiri-new-blue",
        className,
      )}
    >
      <Icons.moreHorizontal className="h-5 w-5 text-shamiri-text-grey" />
    </DropdownMenuTrigger>
  );
}

// For an item that is the `render` of a `DialogTrigger` inside the menu: selecting an item closes
// the menu, which would unmount the dialog it just opened, so the menu stays open behind the dialog.
// The trigger passes role="button"; the item keeps its own role.
export function NestedDialogMenuItem(props: ComponentProps<typeof DropdownMenuItem>) {
  return <DropdownMenuItem {...props} role="menuitem" closeOnClick={false} />;
}
