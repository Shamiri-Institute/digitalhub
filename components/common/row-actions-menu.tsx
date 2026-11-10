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
        "absolute inset-0 flex items-center justify-center border-l focus-visible:-outline-offset-2",
        className,
      )}
    >
      <Icons.moreHorizontal className="h-5 w-5 text-muted-foreground" />
    </DropdownMenuTrigger>
  );
}

// For an item wrapped in a `DialogTrigger` inside the menu: selecting an item closes the menu,
// which would unmount the dialog it just opened, so the menu stays open behind the dialog.
export function NestedDialogMenuItem(props: ComponentProps<typeof DropdownMenuItem>) {
  return <DropdownMenuItem {...props} onSelect={(event) => event.preventDefault()} />;
}
