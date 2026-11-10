import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import type * as React from "react";
import { cn } from "#/lib/utils";

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center rounded-md text-sm font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        base: "",
        default: "bg-primary text-primary-foreground hover:bg-navy-80",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-white text-foreground hover:bg-accent",
        secondary: "bg-secondary text-secondary-foreground hover:bg-lavender-20",
        ghost: "text-primary hover:bg-accent",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        base: "",
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        icon: "h-9 w-9",
      },
      active: {
        default: "",
        scale: "transition active:scale-95",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      active: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  loading?: boolean;
}

function Button({
  className,
  variant,
  size,
  loading,
  children,
  ref,
  ...props
}: ButtonProps & { ref?: React.Ref<HTMLButtonElement> }) {
  return (
    // oxlint-disable-next-line react/button-has-type -- type is forwarded through props; defaulting it would break submit buttons
    <button
      className={cn(buttonVariants({ variant, size, className }))}
      disabled={loading}
      ref={ref}
      {...props}
    >
      {loading && <Loader2 className={cn("h-4 w-4 animate-spin", children && "mr-2")} />}
      {children}
    </button>
  );
}

export { Button, buttonVariants };
