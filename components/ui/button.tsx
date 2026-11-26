"use client";

import { Button as ButtonPrimitive } from "@base-ui/react/button";
import type { VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";

import { buttonVariants } from "#/components/ui/button-variants";
import { cn } from "#/lib/utils";

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

export { Button, type ButtonProps };
