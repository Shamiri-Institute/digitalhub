import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";

import { cn } from "#/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium transition-all focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-shamiri-new-blue focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-disabled:pointer-events-none data-disabled:opacity-50 shrink-0",
  {
    variants: {
      variant: {
        base: "",
        default: "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90",
        brand:
          "bg-shamiri-new-blue text-white dark:bg-card-foreground dark:text-card dark:font-semibold shadow-sm hover:shadow-lg",
        destructive: "bg-shamiri-light-red text-white",
        outline:
          "border border-input bg-transparent shadow-xs hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80",
        ghost: "hover:bg-accent text-shamiri-new-blue",
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
      variant: "brand",
      size: "default",
      active: "default",
    },
  },
);

type ButtonProps = ButtonPrimitive.Props &
  VariantProps<typeof buttonVariants> & {
    loading?: boolean;
  };

function Button({
  className,
  variant,
  size,
  active,
  loading,
  disabled,
  children,
  type,
  ...props
}: ButtonProps) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, active }), className)}
      disabled={disabled || loading}
      // Base UI defaults a native button to type="button"; forms here rely on the HTML default.
      type={type ?? (props.render ? undefined : "submit")}
      {...props}
    >
      {loading && <Loader2 className={cn("h-4 w-4 animate-spin", children && "mr-2")} />}
      {children}
    </ButtonPrimitive>
  );
}

export { Button, type ButtonProps, buttonVariants };
