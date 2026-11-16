import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";

import { cn } from "#/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-1.5 py-0.5 text-sm font-semibold transition-colors leading-5",
  {
    variants: {
      variant: {
        default: "border-info-border bg-info-bg text-info",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        destructive: "border-destructive-border bg-destructive-bg text-destructive",
        outline: "border-border bg-transparent text-foreground",
        success: "border-success-border bg-success-bg text-success",
        warning: "border-warning-border bg-warning-bg text-warning",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
