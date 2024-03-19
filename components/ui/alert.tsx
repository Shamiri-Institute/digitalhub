import { cn } from "#/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

// FIXME: ensure that we use Inter font here
const alertVariants = cva("w-full text-sm font-medium", {
  variants: {
    variant: {
      primary:
        "bg-shamiri-new-light-blue border-bg-shamiri-new-lighter-blue text-shamiri-new-blue rounded-xl p-3",
      default: "bg-background text-foreground rounded-lg border",
      destructive:
        "border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive rounded-lg border",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>
>(({ className, variant, ...props }, ref) => (
  <div
    ref={ref}
    role="alert"
    className={cn(alertVariants({ variant }), className)}
    {...props}
  />
));
Alert.displayName = "Alert";

const AlertTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5 ref={ref} className={cn("font-medium leading-5", className)} {...props} />
));
AlertTitle.displayName = "AlertTitle";

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm [&_p]:leading-relaxed", className)}
    {...props}
  />
));
AlertDescription.displayName = "AlertDescription";

export { Alert, AlertDescription, AlertTitle };
