"use client";

import type { ComponentProps } from "react";
import { Icons } from "#/components/icons";
import { DropdownMenuItem, DropdownMenuTrigger } from "#/components/ui/dropdown-menu";
import { cn } from "#/lib/utils";

// The row's "…" button, for a menu that takes its trigger as a prop (see deferred()).
export function rowActionsButton(label: string, className?: string) {
  return (
    <button
      type="button"
      aria-label={label}
      className={cn(
        "absolute inset-0 flex items-center justify-center rounded-sm text-muted-foreground hover:bg-accent hover:text-primary focus-visible:-outline-offset-2",
        className,
      )}
    >
      <Icons.moreHorizontal className="h-5 w-5" />
    </button>
  );
}

export function RowActionsTrigger({ label, className }: { label: string; className?: string }) {
  return <DropdownMenuTrigger render={rowActionsButton(label, className)} />;
}

// For an item rendered as a `DialogTrigger` inside the menu: closing the menu would unmount the
// dialog it just opened, so the menu stays open behind the dialog.
export function NestedDialogMenuItem(props: ComponentProps<typeof DropdownMenuItem>) {
  return <DropdownMenuItem closeOnClick={false} {...props} />;
}
