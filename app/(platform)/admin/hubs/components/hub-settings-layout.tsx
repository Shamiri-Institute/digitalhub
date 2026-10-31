import { Info } from "lucide-react";
import type React from "react";

export function SettingsSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section
      aria-label={title}
      className="grid gap-4 border-b py-8 first:pt-2 last:border-b-0 lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-10"
    >
      <div className="space-y-1">
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        <p className="text-sm text-shamiri-text-dark-grey">{description}</p>
      </div>
      <div className="min-w-0 space-y-6">{children}</div>
    </section>
  );
}

export const HUB_DETAILS_DESCRIPTION =
  "How the hub appears across the admin area and to its hub managers.";
export const SESSION_TYPES_DESCRIPTION =
  "The sessions this hub can schedule, and the amount paid to a fellow for each one they attend.";

export function PayoutNote() {
  return (
    <p className="flex items-start gap-2 rounded-lg border border-blue-border bg-blue-bg px-4 py-3 text-sm text-foreground">
      <Info aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-shamiri-new-blue" />
      Attendance marked after you save is paid at the new amount. Payouts already recorded keep
      their amount, including when attendance is unmarked.
    </p>
  );
}

export function SessionGroupHeading({
  label,
  count,
  children,
}: {
  label: string;
  count: number;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h4 className="text-sm font-semibold text-foreground">
        {label}{" "}
        <span className="font-normal tabular-nums text-shamiri-text-dark-grey">{count}</span>
      </h4>
      {children}
    </div>
  );
}
