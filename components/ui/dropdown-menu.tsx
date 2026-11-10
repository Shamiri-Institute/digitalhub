"use client";

import { Menu } from "@base-ui/react/menu";
import { Check } from "lucide-react";
import type * as React from "react";

import { cn } from "#/lib/utils";

const DropdownMenu = Menu.Root;

const DropdownMenuTrigger = Menu.Trigger;

function DropdownMenuContent({
  className,
  side,
  align,
  sideOffset = 4,
  ...props
}: Menu.Popup.Props & Pick<Menu.Positioner.Props, "side" | "align" | "sideOffset">) {
  return (
    <Menu.Portal>
      <Menu.Positioner side={side} align={align} sideOffset={sideOffset} className="z-50">
        <Menu.Popup
          data-slot="dropdown-menu-content"
          className={cn(
            "min-w-32 overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md outline-hidden transition-[opacity,scale] duration-100 data-ending-style:opacity-0 data-starting-style:opacity-0 motion-safe:data-ending-style:scale-95 motion-safe:data-starting-style:scale-95",
            className,
          )}
          {...props}
        />
      </Menu.Positioner>
    </Menu.Portal>
  );
}

const itemClass =
  "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-hidden transition-colors data-highlighted:bg-accent data-highlighted:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50";

function DropdownMenuItem({ className, ...props }: Menu.Item.Props) {
  return (
    <Menu.Item data-slot="dropdown-menu-item" className={cn(itemClass, className)} {...props} />
  );
}

function DropdownMenuLinkItem({ className, ...props }: Menu.LinkItem.Props) {
  return (
    <Menu.LinkItem data-slot="dropdown-menu-item" className={cn(itemClass, className)} {...props} />
  );
}

function DropdownMenuCheckboxItem({ className, children, ...props }: Menu.CheckboxItem.Props) {
  return (
    <Menu.CheckboxItem
      data-slot="dropdown-menu-checkbox-item"
      className={cn(itemClass, "cursor-pointer pl-8", className)}
      {...props}
    >
      <span className="absolute left-2 flex h-4 w-4 items-center justify-center rounded border border-input bg-white in-data-checked:border-primary in-data-checked:bg-primary in-data-checked:text-primary-foreground">
        <Menu.CheckboxItemIndicator>
          <Check className="h-3.5 w-3.5" strokeWidth={3} />
        </Menu.CheckboxItemIndicator>
      </span>
      {children}
    </Menu.CheckboxItem>
  );
}

function DropdownMenuLabel({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dropdown-menu-label"
      className={cn("px-2 py-1.5 text-sm font-semibold", className)}
      {...props}
    />
  );
}

function DropdownMenuSeparator({ className, ...props }: Menu.Separator.Props) {
  return (
    <Menu.Separator
      data-slot="dropdown-menu-separator"
      className={cn("-mx-1 my-1 h-px bg-border", className)}
      {...props}
    />
  );
}

export {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuLinkItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
};
