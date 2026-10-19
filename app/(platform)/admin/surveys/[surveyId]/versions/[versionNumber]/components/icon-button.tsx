import type { ComponentProps } from "react";

import { Button } from "#/components/ui/button";
import { cn } from "#/lib/utils";

/** A small icon-only button for the builder's arrange controls, named by `label`. */
export default function IconButton({
  label,
  className,
  ...props
}: ComponentProps<typeof Button> & { label: string }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={label}
      title={label}
      className={cn("h-8 w-8 shrink-0 text-shamiri-text-grey", className)}
      {...props}
    />
  );
}
