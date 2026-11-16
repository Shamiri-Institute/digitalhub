"use client";

import { Radio } from "@base-ui/react/radio";
import { RadioGroup } from "@base-ui/react/radio-group";
import type * as React from "react";

import { type ToggleVariants, toggleVariants } from "#/components/ui/toggle";
import { cn } from "#/lib/utils";

/** A segmented control: one choice at a time, announced as a radio group. */
function ToggleGroup({ className, ...props }: React.ComponentProps<typeof RadioGroup<string>>) {
  return (
    <RadioGroup<string>
      data-slot="toggle-group"
      className={cn("flex items-center justify-center gap-1", className)}
      {...props}
    />
  );
}

function ToggleGroupItem({
  className,
  variant,
  size,
  ...props
}: React.ComponentProps<typeof Radio.Root<string>> & ToggleVariants) {
  return (
    <Radio.Root<string>
      data-slot="toggle-group-item"
      className={cn(toggleVariants({ variant, size }), "cursor-pointer", className)}
      {...props}
    />
  );
}

export { ToggleGroup, ToggleGroupItem };
