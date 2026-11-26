"use client";

import { Toggle as TogglePrimitive } from "@base-ui/react/toggle";
import { ToggleGroup as ToggleGroupPrimitive } from "@base-ui/react/toggle-group";
import type { VariantProps } from "class-variance-authority";
import * as React from "react";

import { toggleVariants } from "#/components/ui/toggle";
import { cn } from "#/lib/utils";

const ToggleGroupContext = React.createContext<VariantProps<typeof toggleVariants>>({
  size: "default",
  variant: "default",
});

/**
 * A single-choice group: one item is always pressed once chosen. A click on the pressed item keeps
 * it, so `onValueChange` only ever receives an item's value.
 */
function ToggleGroup({
  className,
  variant,
  size,
  children,
  value,
  defaultValue,
  onValueChange,
  ...props
}: Omit<
  ToggleGroupPrimitive.Props<string>,
  "className" | "value" | "defaultValue" | "onValueChange" | "multiple"
> &
  VariantProps<typeof toggleVariants> & {
    className?: string;
    value?: string;
    defaultValue?: string;
    onValueChange?: (value: string) => void;
  }) {
  return (
    <ToggleGroupPrimitive<string>
      data-slot="toggle-group"
      className={cn("flex items-center justify-center gap-1", className)}
      value={value === undefined ? undefined : [value]}
      defaultValue={defaultValue === undefined ? undefined : [defaultValue]}
      onValueChange={(pressed, eventDetails) => {
        const [next] = pressed;
        if (next === undefined) eventDetails.cancel();
        else onValueChange?.(next);
      }}
      {...props}
    >
      <ToggleGroupContext value={{ variant, size }}>{children}</ToggleGroupContext>
    </ToggleGroupPrimitive>
  );
}

function ToggleGroupItem({
  className,
  children,
  variant,
  size,
  ...props
}: Omit<TogglePrimitive.Props<string>, "className"> &
  VariantProps<typeof toggleVariants> & { className?: string }) {
  const context = React.use(ToggleGroupContext);

  return (
    <TogglePrimitive
      data-slot="toggle-group-item"
      className={cn(
        toggleVariants({
          variant: context.variant || variant,
          size: context.size || size,
        }),
        className,
      )}
      {...props}
    >
      {children}
    </TogglePrimitive>
  );
}

export { ToggleGroup, ToggleGroupItem };
