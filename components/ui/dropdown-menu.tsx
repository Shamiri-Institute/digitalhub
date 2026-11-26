"use client";

import { Menu as MenuPrimitive } from "@base-ui/react/menu";
import { Check, ChevronRight, Circle } from "lucide-react";
import type * as React from "react";

import { cn } from "#/lib/utils";

const DropdownMenu = MenuPrimitive.Root;

const DropdownMenuTrigger = MenuPrimitive.Trigger;

const DropdownMenuGroup = MenuPrimitive.Group;

const DropdownMenuPortal = MenuPrimitive.Portal;

const DropdownMenuSub = MenuPrimitive.SubmenuRoot;

const DropdownMenuRadioGroup = MenuPrimitive.RadioGroup;

const popupClassName =
  "z-50 max-h-(--available-height) min-w-32 origin-(--transform-origin) overflow-y-auto overflow-x-hidden rounded-md border bg-popover p-1 text-popover-foreground outline-none data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 data-closed:motion-safe:zoom-out-95 data-open:motion-safe:zoom-in-95 data-[side=bottom]:motion-safe:slide-in-from-top-2 data-[side=left]:motion-safe:slide-in-from-right-2 data-[side=right]:motion-safe:slide-in-from-left-2 data-[side=top]:motion-safe:slide-in-from-bottom-2";

function DropdownMenuSubTrigger({
  className,
  inset,
  children,
  ...props
}: Omit<MenuPrimitive.SubmenuTrigger.Props, "className"> & {
  className?: string;
  inset?: boolean;
}) {
  return (
    <MenuPrimitive.SubmenuTrigger
      data-slot="dropdown-menu-sub-trigger"
      className={cn(
        "flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-hidden data-highlighted:bg-accent data-popup-open:bg-accent",
        inset && "pl-8",
        className,
      )}
      {...props}
    >
      {children}
      <ChevronRight className="ml-auto h-4 w-4" />
    </MenuPrimitive.SubmenuTrigger>
  );
}

function DropdownMenuContent({
  className,
  align = "center",
  side = "bottom",
  sideOffset = 4,
  ...props
}: Omit<MenuPrimitive.Popup.Props, "className"> &
  Pick<MenuPrimitive.Positioner.Props, "align" | "side" | "sideOffset"> & {
    className?: string;
  }) {
  return (
    <MenuPrimitive.Portal>
      <MenuPrimitive.Positioner
        align={align}
        side={side}
        sideOffset={sideOffset}
        className="isolate z-50 outline-none"
      >
        <MenuPrimitive.Popup
          data-slot="dropdown-menu-content"
          className={cn(popupClassName, "shadow-md", className)}
          {...props}
        />
      </MenuPrimitive.Positioner>
    </MenuPrimitive.Portal>
  );
}

function DropdownMenuSubContent({
  className,
  align = "start",
  side = "right",
  sideOffset = 0,
  ...props
}: React.ComponentProps<typeof DropdownMenuContent>) {
  return (
    <DropdownMenuContent
      data-slot="dropdown-menu-sub-content"
      className={cn("shadow-lg", className)}
      align={align}
      side={side}
      sideOffset={sideOffset}
      {...props}
    />
  );
}

function DropdownMenuItem({
  className,
  inset,
  ...props
}: Omit<MenuPrimitive.Item.Props, "className"> & {
  className?: string;
  inset?: boolean;
}) {
  return (
    <MenuPrimitive.Item
      data-slot="dropdown-menu-item"
      className={cn(
        "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-hidden transition-colors data-highlighted:bg-accent data-highlighted:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50",
        inset && "pl-8",
        className,
      )}
      {...props}
    />
  );
}

function DropdownMenuCheckboxItem({
  className,
  children,
  ...props
}: Omit<MenuPrimitive.CheckboxItem.Props, "className"> & { className?: string }) {
  return (
    <MenuPrimitive.CheckboxItem
      data-slot="dropdown-menu-checkbox-item"
      className={cn(
        "group relative flex cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-hidden transition-colors data-highlighted:bg-accent data-highlighted:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <span className="absolute left-2 flex h-4 w-4 items-center justify-center overflow-hidden rounded border border-shamiri-light-grey bg-white drop-shadow-sm group-data-checked:border-shamiri-new-blue">
        <MenuPrimitive.CheckboxItemIndicator className="bg-shamiri-new-blue text-white">
          <Check className="h-4 w-4" />
        </MenuPrimitive.CheckboxItemIndicator>
      </span>
      {children}
    </MenuPrimitive.CheckboxItem>
  );
}

function DropdownMenuRadioItem({
  className,
  children,
  ...props
}: Omit<MenuPrimitive.RadioItem.Props, "className"> & { className?: string }) {
  return (
    <MenuPrimitive.RadioItem
      data-slot="dropdown-menu-radio-item"
      className={cn(
        "relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-hidden transition-colors data-highlighted:bg-accent data-highlighted:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
        <MenuPrimitive.RadioItemIndicator>
          <Circle className="h-4 w-4 fill-current" />
        </MenuPrimitive.RadioItemIndicator>
      </span>
      {children}
    </MenuPrimitive.RadioItem>
  );
}

function DropdownMenuLabel({
  className,
  inset,
  ...props
}: React.ComponentProps<"div"> & {
  inset?: boolean;
}) {
  return (
    <div
      data-slot="dropdown-menu-label"
      className={cn("px-2 py-1.5 text-sm font-semibold", inset && "pl-8", className)}
      {...props}
    />
  );
}

function DropdownMenuSeparator({
  className,
  ...props
}: Omit<MenuPrimitive.Separator.Props, "className"> & { className?: string }) {
  return (
    <MenuPrimitive.Separator
      data-slot="dropdown-menu-separator"
      className={cn("-mx-1 my-1 h-px bg-muted", className)}
      {...props}
    />
  );
}

const DropdownMenuShortcut = ({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) => {
  return (
    <span className={cn("ml-auto text-xs tracking-widest opacity-60", className)} {...props} />
  );
};
DropdownMenuShortcut.displayName = "DropdownMenuShortcut";

export {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
};
