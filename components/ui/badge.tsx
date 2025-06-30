import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";

import { cn } from "#/lib/utils";

// TODO: FONT FIGTREE
const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-1.5 py-0.5 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 leading-5",
  {
    variants: {
      variant: {
        default:
          "border-shamiri-new-blue bg-shamiri-new-light-blue text-shamiri-new-blue border-blue-border",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "text-shamiri-light-red bg-shamiri-light-red-background-base/[.1] border-red-border",
        outline: "text-foreground",
        "shamiri-green":
          "bg-shamiri-light-green border-green-border text-shamiri-green",
        warning:
          "bg-shamiri-light-orange/[0.1] border-[#F98600]/[0.3] text-shamiri-light-orange",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
