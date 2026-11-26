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
}: React.ComponentProps<"label"> & VariantProps<typeof labelVariants> & { required?: boolean }) {
  return (
    <label data-slot="label" className={cn(labelVariants(), className)} {...props}>
      {children}
      {required && (
        <span aria-hidden="true" className="text-shamiri-light-red">
          {" *"}
        </span>
      )}
    </label>
  );
}

export { Label };
