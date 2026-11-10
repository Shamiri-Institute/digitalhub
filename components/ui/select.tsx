"use client";

import { Select as SelectPrimitive } from "@base-ui/react/select";
import { Check } from "lucide-react";
import * as React from "react";

import { Icons } from "#/components/icons";
import { cn } from "#/lib/utils";

// Base UI's trigger shows the raw value unless it is given each value's label. Every caller writes
// its items inline, so the labels are read from the <SelectItem> elements in the children.
function itemLabels(children: React.ReactNode, labels: Record<string, React.ReactNode> = {}) {
  React.Children.forEach(children, (child) => {
    if (!React.isValidElement<{ value?: unknown; children?: React.ReactNode }>(child)) return;
    if (child.type === SelectItem) {
      labels[String(child.props.value)] = child.props.children;
    } else {
      itemLabels(child.props.children, labels);
    }
  });
  return labels;
}

// A caller that passes `value` controls the select even while the value is still undefined or "",
// which both mean nothing is chosen. No select here offers an empty choice, so a change is always
// a picked value.
function Select({
  children,
  onValueChange,
  ...props
}: Omit<SelectPrimitive.Root.Props<string>, "value" | "onValueChange"> & {
  value?: string | null;
  onValueChange?: (value: string) => void;
}) {
  const { value, ...rest } = props;
  const controlled = "value" in props ? { value: value || null } : {};
  return (
    <SelectPrimitive.Root<string>
      items={itemLabels(children)}
      onValueChange={(picked) => {
        if (picked !== null) onValueChange?.(picked);
      }}
      {...controlled}
      {...rest}
    >
      {children}
    </SelectPrimitive.Root>
  );
}

function SelectValue({ placeholder, ...props }: SelectPrimitive.Value.Props) {
  return (
    <SelectPrimitive.Value
      data-slot="select-value"
      className="data-placeholder:text-muted-foreground"
      placeholder={placeholder}
      {...props}
    />
  );
}

function SelectTrigger({
  className,
  children,
  hideIcon,
  ...props
}: SelectPrimitive.Trigger.Props & { hideIcon?: true }) {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      className={cn(
        "flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-white px-3 py-2 text-left text-sm aria-invalid:border-destructive data-disabled:cursor-not-allowed data-disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <span className="overflow-hidden text-ellipsis whitespace-nowrap">{children}</span>
      {!hideIcon && (
        <SelectPrimitive.Icon className="shrink-0">
          <Icons.chevronDown className="h-4 w-4 opacity-50" />
        </SelectPrimitive.Icon>
      )}
    </SelectPrimitive.Trigger>
  );
}

function SelectContent({
  className,
  children,
  side,
  align = "start",
  sideOffset = 4,
  ...props
}: SelectPrimitive.Popup.Props &
  Pick<SelectPrimitive.Positioner.Props, "side" | "align" | "sideOffset">) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Positioner
        side={side}
        align={align}
        sideOffset={sideOffset}
        alignItemWithTrigger={false}
        className="z-50"
      >
        <SelectPrimitive.Popup
          data-slot="select-content"
          className={cn(
            "max-h-(--available-height) min-w-(--anchor-width) overflow-y-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md outline-hidden transition-opacity duration-100 data-ending-style:opacity-0 data-starting-style:opacity-0",
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

function SelectItem({ className, children, ...props }: SelectPrimitive.Item.Props) {
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className={cn(
        "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-hidden data-highlighted:bg-accent data-highlighted:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <span className="absolute right-2 flex h-3.5 w-3.5 items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <Check className="h-4 w-4" />
        </SelectPrimitive.ItemIndicator>
      </span>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  );
}

export { Select, SelectContent, SelectItem, SelectTrigger, SelectValue };
