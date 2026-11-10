"use client";

import * as LabelPrimitive from "@radix-ui/react-label";
import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";

import { cn } from "#/lib/utils";

const labelVariants = cva(
  "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
);

function Label({
  className,
  required,
  children,
  ...props
}: React.ComponentProps<typeof LabelPrimitive.Root> &
  VariantProps<typeof labelVariants> & { required?: boolean }) {
  return (
    <LabelPrimitive.Root data-slot="label" className={cn(labelVariants(), className)} {...props}>
      {children}
      {required && (
        <span aria-hidden="true" className="text-destructive">
          {" *"}
        </span>
      )}
    </LabelPrimitive.Root>
  );
}

export { Label };
