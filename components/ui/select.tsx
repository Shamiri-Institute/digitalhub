"use client";

import { mergeProps } from "@base-ui/react/merge-props";
import type { Select as SelectParts } from "@base-ui/react/select";
import { Check } from "lucide-react";
import * as React from "react";

import { afterPage, type StandIn, useStandIn } from "#/components/deferred";
import { Icons } from "#/components/icons";
import { cn } from "#/lib/utils";

// Base UI's Select is about 45 KB gzipped, and every table page draws one (rows per page) that
// most visits never open. A select draws its closed trigger, with the chosen label, until the code
// has loaded after the page, then hands over to Base UI.
const [useSelectCode, loadSelectCode] = afterPage(() =>
  import("@base-ui/react/select").then((mod) => mod.Select),
);

type SelectState = {
  Parts: typeof SelectParts | null;
  chosenLabel: React.ReactNode;
  disabled: boolean;
} & StandIn;

const SelectCode = React.createContext<SelectState | null>(null);

function useSelectState() {
  const state = React.use(SelectCode);
  if (!state) throw new Error("Select parts must be inside <Select>");
  return state;
}

// Items render only inside an open popup, and a popup opens only once the code has loaded.
function useLoadedSelect() {
  const { Parts } = useSelectState();
  if (!Parts) throw new Error("A select item rendered before the select's code loaded");
  return Parts;
}

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
}: Omit<SelectParts.Root.Props<string>, "value" | "onValueChange"> & {
  value?: string | null;
  onValueChange?: (value: string) => void;
}) {
  const Parts = useSelectCode();
  const standIn = useStandIn(loadSelectCode);
  const labels = itemLabels(children);
  const { value, ...rest } = props;
  const controlled = "value" in props ? { value: value || null } : {};
  const chosen = "value" in props ? value : props.defaultValue;
  const state: SelectState = {
    Parts,
    chosenLabel: chosen ? (labels[chosen] ?? chosen) : null,
    disabled: Boolean(props.disabled),
    ...standIn,
  };
  return (
    <SelectCode value={state}>
      {Parts ? (
        <Parts.Root<string>
          items={labels}
          onValueChange={(picked) => {
            if (picked !== null) onValueChange?.(picked);
          }}
          {...controlled}
          {...rest}
        >
          {children}
        </Parts.Root>
      ) : (
        children
      )}
    </SelectCode>
  );
}

const valueClass = "data-placeholder:text-muted-foreground";

function SelectValue({ placeholder, children, ...props }: SelectParts.Value.Props) {
  const { Parts, chosenLabel } = useSelectState();
  if (!Parts) {
    const shown = typeof children === "function" ? null : (children ?? chosenLabel);
    return (
      <span
        data-slot="select-value"
        className={valueClass}
        data-placeholder={shown == null ? "" : undefined}
      >
        {shown ?? placeholder}
      </span>
    );
  }
  return (
    <Parts.Value
      data-slot="select-value"
      className={valueClass}
      placeholder={placeholder}
      {...props}
    >
      {children}
    </Parts.Value>
  );
}

const triggerClass =
  "flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-white px-3 py-2 text-left text-sm aria-invalid:border-destructive data-disabled:cursor-not-allowed data-disabled:opacity-50";

// Only what a plain button also takes, so the stand-in draws the same element.
type TriggerProps = Omit<React.ComponentProps<"button">, "ref"> & { hideIcon?: true };

function SelectTrigger({ className, children, hideIcon, ...props }: TriggerProps) {
  const { Parts, chosenLabel, disabled, standInHandlers, takeOver } = useSelectState();
  const face = <span className="overflow-hidden text-ellipsis whitespace-nowrap">{children}</span>;
  const chevron = <Icons.chevronDown className="h-4 w-4 opacity-50" />;
  if (!Parts) {
    const isDisabled = disabled || Boolean(props.disabled);
    return (
      <button
        type="button"
        data-slot="select-trigger"
        {...mergeProps<"button">(
          { role: "combobox", "aria-haspopup": "listbox", "aria-expanded": false },
          props,
          standInHandlers,
        )}
        disabled={isDisabled}
        data-disabled={isDisabled ? "" : undefined}
        data-placeholder={chosenLabel == null ? "" : undefined}
        className={cn(triggerClass, className)}
      >
        {face}
        {!hideIcon && (
          <span className="shrink-0" aria-hidden>
            {chevron}
          </span>
        )}
      </button>
    );
  }
  return (
    <Parts.Trigger
      data-slot="select-trigger"
      className={cn(triggerClass, className)}
      {...props}
      ref={takeOver}
    >
      {face}
      {!hideIcon && <Parts.Icon className="shrink-0">{chevron}</Parts.Icon>}
    </Parts.Trigger>
  );
}

function SelectContent({
  className,
  children,
  side,
  align = "start",
  sideOffset = 4,
  ...props
}: SelectParts.Popup.Props & Pick<SelectParts.Positioner.Props, "side" | "align" | "sideOffset">) {
  const { Parts } = useSelectState();
  if (!Parts) return null;
  return (
    <Parts.Portal>
      <Parts.Positioner
        side={side}
        align={align}
        sideOffset={sideOffset}
        alignItemWithTrigger={false}
        className="z-50"
      >
        <Parts.Popup
          data-slot="select-content"
          className={cn(
            "max-h-(--available-height) min-w-(--anchor-width) overflow-y-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md outline-hidden transition-opacity duration-100 data-ending-style:opacity-0 data-starting-style:opacity-0",
            className,
          )}
          {...props}
        >
          {children}
        </Parts.Popup>
      </Parts.Positioner>
    </Parts.Portal>
  );
}

function SelectItem({ className, children, ...props }: SelectParts.Item.Props) {
  const Parts = useLoadedSelect();
  return (
    <Parts.Item
      data-slot="select-item"
      className={cn(
        "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-hidden data-highlighted:bg-accent data-highlighted:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <span className="absolute right-2 flex h-3.5 w-3.5 items-center justify-center">
        <Parts.ItemIndicator>
          <Check className="h-4 w-4" />
        </Parts.ItemIndicator>
      </span>
      <Parts.ItemText>{children}</Parts.ItemText>
    </Parts.Item>
  );
}

export { Select, SelectContent, SelectItem, SelectTrigger, SelectValue };
