"use client";

import { Radio as RadioPrimitive } from "@base-ui/react/radio";
import { RadioGroup as RadioGroupPrimitive } from "@base-ui/react/radio-group";
import { Check } from "lucide-react";

import { cn } from "#/lib/utils";

function RadioGroup({
  className,
  onValueChange,
  ...props
}: Omit<RadioGroupPrimitive.Props<string>, "className" | "onValueChange"> & {
  className?: string;
  onValueChange?: (value: string) => void;
}) {
  return (
    <RadioGroupPrimitive<string>
      data-slot="radio-group"
      className={cn("grid gap-2", className)}
      onValueChange={(value) => onValueChange?.(value)}
      {...props}
    />
  );
}

function RadioGroupItem({
  className,
  ...props
}: Omit<RadioPrimitive.Root.Props<string>, "className"> & { className?: string }) {
  return (
    <RadioPrimitive.Root
      data-slot="radio-group-item"
      // As a button the control takes the id, so a `<Label htmlFor>` names it and not the hidden input.
      nativeButton
      render={(buttonProps) => <button type="button" {...buttonProps} />}
      className={cn(
        "relative inline-flex aspect-square h-4 w-4 items-center after:absolute after:-inset-1 justify-center rounded-full border border-primary text-primary shadow-sm focus:outline-hidden focus-visible:ring-2 focus-visible:ring-shamiri-new-blue data-disabled:cursor-not-allowed data-disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <RadioPrimitive.Indicator className="flex items-center justify-center">
        <Check className="h-3.5 w-3.5 fill-primary" />
      </RadioPrimitive.Indicator>
    </RadioPrimitive.Root>
  );
}

export { RadioGroup, RadioGroupItem };
