import type * as React from "react";

import { cn } from "#/lib/utils";

function Label({
  className,
  required,
  children,
  ...props
}: React.ComponentProps<"label"> & { required?: boolean }) {
  return (
    // oxlint-disable-next-line jsx-a11y/label-has-associated-control -- callers pass htmlFor or wrap the control
    <label
      data-slot="label"
      className={cn(
        "text-sm font-semibold leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
        className,
      )}
      {...props}
    >
      {children}
      {required && (
        <span aria-hidden="true" className="text-destructive">
          {" *"}
        </span>
      )}
    </label>
  );
}

export { Label };
