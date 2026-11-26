"use client";

import { Select as SelectPrimitive } from "@base-ui/react/select";
import { Check } from "lucide-react";
import * as React from "react";

import { cn } from "#/lib/utils";
import { Icons } from "../icons";

/**
 * The label of each `SelectItem` written inside the select, by value, so `SelectValue` shows the
 * chosen item's text rather than its value. Base UI renders the raw value unless it is given
 * these labels.
 */
function itemLabels(children: React.ReactNode, labels: Record<string, React.ReactNode> = {}) {
  React.Children.forEach(children, (child) => {
    if (!React.isValidElement<{ value?: unknown; children?: React.ReactNode }>(child)) return;
    if (child.type === SelectItem && typeof child.props.value === "string") {
      labels[child.props.value] = child.props.children;
      return;
    }
    itemLabels(child.props.children, labels);
  });
  return labels;
}

/**
 * A select of string values, where `""` is no value. Pass `items` for the labels of `SelectItem`s
 * that a component renders, which the select cannot see.
 */
function Select({
  value,
  defaultValue,
  onValueChange,
  items,
  children,
  ...props
}: Omit<
  SelectPrimitive.Root.Props<string>,
  "value" | "defaultValue" | "onValueChange" | "multiple" | "items"
> & {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  items?: Record<string, React.ReactNode>;
}) {
  return (
    <SelectPrimitive.Root<string>
      items={{ ...itemLabels(children), ...items }}
      value={value === undefined ? undefined : value || null}
      defaultValue={defaultValue || null}
      onValueChange={(next) => onValueChange?.(next ?? "")}
      {...props}
    >
      {children}
    </SelectPrimitive.Root>
  );
}

const SelectGroup = SelectPrimitive.Group;

function SelectValue({
  className,
  ...props
}: Omit<SelectPrimitive.Value.Props, "className"> & { className?: string }) {
  return (
    <SelectPrimitive.Value
      data-slot="select-value"
      className={cn("data-placeholder:text-muted-foreground", className)}
      {...props}
    />
  );
}

function SelectTrigger({
  className,
  children,
  hideIcon,
  ...props
}: Omit<SelectPrimitive.Trigger.Props, "className"> & {
  className?: string;
  hideIcon?: true;
}) {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      className={cn(
        "flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs ring-offset-background focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-shamiri-new-blue focus-visible:ring-offset-2 aria-invalid:border-destructive data-disabled:cursor-not-allowed data-disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <span className="overflow-hidden text-ellipsis whitespace-nowrap">{children}</span>
      {!hideIcon && (
        <SelectPrimitive.Icon render={<Icons.chevronDown className="h-4 w-4 opacity-50" />} />
      )}
    </SelectPrimitive.Trigger>
  );
}

function SelectContent({
  className,
  children,
  align = "start",
  side = "bottom",
  sideOffset = 4,
  ...props
}: Omit<SelectPrimitive.Popup.Props, "className"> &
  Pick<SelectPrimitive.Positioner.Props, "align" | "side" | "sideOffset"> & {
    className?: string;
  }) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Positioner
        align={align}
        side={side}
        sideOffset={sideOffset}
        alignItemWithTrigger={false}
        className="isolate z-50"
      >
        <SelectPrimitive.Popup
          data-slot="select-content"
          className={cn(
            "relative z-50 max-h-(--available-height) min-w-(--anchor-width) origin-(--transform-origin) overflow-y-auto overflow-x-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md data-open:animate-in data-open:fade-in-0 data-open:motion-safe:zoom-in-95 data-[side=bottom]:motion-safe:slide-in-from-top-2 data-[side=left]:motion-safe:slide-in-from-right-2 data-[side=right]:motion-safe:slide-in-from-left-2 data-[side=top]:motion-safe:slide-in-from-bottom-2",
            className,
          )}
          {...props}
        >
          <SelectPrimitive.List>{children}</SelectPrimitive.List>
        </SelectPrimitive.Popup>
      </SelectPrimitive.Positioner>
    </SelectPrimitive.Portal>
  );
}

function SelectLabel({
  className,
  ...props
}: Omit<SelectPrimitive.GroupLabel.Props, "className"> & { className?: string }) {
  return (
    <SelectPrimitive.GroupLabel
      data-slot="select-label"
      className={cn("px-2 py-1.5 text-base font-semibold", className)}
      {...props}
    />
  );
}

function SelectItem({
  className,
  children,
  ...props
}: Omit<SelectPrimitive.Item.Props, "className" | "value"> & {
  className?: string;
  value: string;
}) {
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className={cn(
        "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-hidden data-highlighted:bg-accent data-highlighted:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <SelectPrimitive.ItemIndicator className="absolute right-2 flex h-3.5 w-3.5 items-center justify-center">
        <Check className="h-4 w-4" />
      </SelectPrimitive.ItemIndicator>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  );
}

function SelectSeparator({
  className,
  ...props
}: Omit<SelectPrimitive.Separator.Props, "className"> & { className?: string }) {
  return (
    <SelectPrimitive.Separator
      data-slot="select-separator"
      className={cn("-mx-1 my-1 h-px bg-muted", className)}
      {...props}
    />
  );
}

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
};
