import type * as React from "react";

import { Label } from "#/components/ui/label";
import { cn } from "#/lib/utils";

interface FieldProps {
  id: string;
  label: string;
  /** Shown under the control, in place of the description, when the field has a problem. */
  message?: string;
  description?: string;
  /** A control beside the label that acts on the field, such as the bold button. */
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

/**
 * A labelled control and its message. The builder keeps the form in a reducer rather than
 * react-hook-form, so `FormField` and `FormMessage`, which read their state from react-hook-form,
 * can't be used here; this mirrors their look.
 */
export function Field({
  id,
  label,
  message,
  description,
  action,
  className,
  children,
}: FieldProps) {
  const labelNode = (
    <Label htmlFor={id} className={cn(message && "text-destructive")}>
      {label}
    </Label>
  );
  return (
    <div className={cn("space-y-1.5", className)}>
      {action ? (
        <div className="flex items-end justify-between gap-2">
          {labelNode}
          {action}
        </div>
      ) : (
        labelNode
      )}
      {children}
      {message ? (
        <p id={`${id}-message`} className="text-xs font-medium text-destructive">
          {message}
        </p>
      ) : (
        description && <p className="text-xs text-muted-foreground">{description}</p>
      )}
    </div>
  );
}
