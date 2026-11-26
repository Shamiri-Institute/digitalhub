"use client";

import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox";
import { Check, Minus } from "lucide-react";

import { cn } from "#/lib/utils";

function Checkbox({
  className,
  checked,
  ...props
}: Omit<CheckboxPrimitive.Root.Props, "className" | "checked" | "indeterminate"> & {
  className?: string;
  checked?: boolean | "indeterminate";
}) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      // As a button the control takes the id, so a `<Label htmlFor>` names it and not the hidden input.
      nativeButton
      render={(buttonProps) => <button type="button" {...buttonProps} />}
      checked={checked === undefined ? undefined : checked === true}
      indeterminate={checked === "indeterminate"}
      className={cn(
        "peer relative inline-flex h-4 w-4 shrink-0 items-center justify-center rounded border border-primary shadow-sm after:absolute after:-inset-1 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-shamiri-new-blue data-disabled:cursor-not-allowed data-disabled:opacity-50 data-checked:bg-primary data-checked:text-primary-foreground data-indeterminate:bg-primary data-indeterminate:text-primary-foreground",
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        className="flex items-center justify-center text-current"
        render={(indicatorProps, state) => (
          <span {...indicatorProps}>
            {state.indeterminate ? <Minus className="h-4 w-4" /> : <Check className="h-4 w-4" />}
          </span>
        )}
      />
    </CheckboxPrimitive.Root>
  );
}

export { Checkbox };
