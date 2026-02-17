import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "#/lib/utils";

// FIXME: ensure that we use Inter font here
const alertVariants = cva("w-full text-sm font-medium rounded-xl p-3", {
  variants: {
    variant: {
      primary: "bg-shamiri-new-light-blue border-2 border-blue-border text-shamiri-new-blue",
      default: "bg-background text-foreground rounded-lg border",
      destructive:
        "border-2 border-red-border text-shamiri-light-red bg-shamiri-light-red-background-base/10",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

function Alert({
  className,
  variant,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  return (
    <div
      data-slot="alert"
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  );
}

function AlertTitle({ className, ...props }: React.ComponentProps<"h5">) {
  return (
    <h5 data-slot="alert-title" className={cn("font-medium leading-5", className)} {...props} />
  );
}

function AlertDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-description"
      className={cn("text-sm [&_p]:leading-relaxed", className)}
      {...props}
    />
  );
}

export { Alert, AlertDescription, AlertTitle };
