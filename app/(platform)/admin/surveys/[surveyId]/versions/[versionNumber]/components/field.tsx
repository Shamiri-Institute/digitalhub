import type * as React from "react";

import { Label } from "#/components/ui/label";
import { cn } from "#/lib/utils";

interface FieldProps {
  id: string;
  label: string;
  /** Shown under the control, in place of the description, when the field has a problem. */
  message?: string;
  description?: string;
  className?: string;
  children: React.ReactNode;
}

/**
 * A labelled control and its message. The builder keeps the form in a reducer rather than
 * react-hook-form, so `FormField` and `FormMessage`, which read their state from react-hook-form,
 * can't be used here; this mirrors their look.
 */
export function Field({ id, label, message, description, className, children }: FieldProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={id} className={cn(message && "text-destructive")}>
        {label}
      </Label>
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
