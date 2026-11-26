import { CircleCheck, Info, TriangleAlert } from "lucide-react";
import type React from "react";

import { Popover, PopoverContent, PopoverTrigger } from "#/components/ui/popover";
import { cn } from "#/lib/utils";

export const formatCount = (n: number) => n.toLocaleString("en-US");

/** An info icon whose explanation opens on hover, or on a tap where there is no hover. */
export function InfoTip({
  label,
  className,
  contentClassName,
  children,
}: {
  label: string;
  className?: string;
  contentClassName?: string;
  children: React.ReactNode;
}) {
  return (
    <Popover>
      <PopoverTrigger
        openOnHover
        aria-label={label}
        className={cn(
          "-my-1 inline-flex h-6 w-6 items-center justify-center rounded-sm text-shamiri-text-dark-grey hover:text-shamiri-black focus-visible:outline-2 focus-visible:outline-shamiri-new-blue",
          className,
        )}
      >
        <Info aria-hidden className="h-3.5 w-3.5" />
      </PopoverTrigger>
      <PopoverContent className={cn("w-auto max-w-60 p-3 text-xs", contentClassName)}>
        {children}
      </PopoverContent>
    </Popover>
  );
}

export function Notice({
  tone,
  children,
}: {
  tone: "attention" | "done";
  children: React.ReactNode;
}) {
  const Icon = tone === "attention" ? TriangleAlert : CircleCheck;
  return (
    <p className="flex items-center gap-2 text-sm font-medium text-shamiri-black">
      <Icon
        aria-hidden
        className={cn(
          "h-4 w-4 shrink-0",
          tone === "attention" ? "text-shamiri-dark-orange" : "text-green-base",
        )}
      />
      {children}
    </p>
  );
}

export function StatCell({
  label,
  info,
  className,
  children,
}: {
  label: string;
  info?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("space-y-1 bg-white px-4 py-3 xl:whitespace-nowrap", className)}>
      <p className="flex items-center gap-1 text-sm font-medium text-shamiri-black">
        {label}
        {info && <InfoTip label={`What ${label.toLowerCase()} counts`}>{info}</InfoTip>}
      </p>
      {children}
    </div>
  );
}

export function Figure({ value, unit }: { value: React.ReactNode; unit?: string }) {
  return (
    <p className="text-shamiri-black">
      <span className="text-2xl font-semibold tabular-nums">{value}</span>
      {unit && <span className="ml-1.5 text-sm">{unit}</span>}
    </p>
  );
}

export function Note({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-shamiri-text-dark-grey">{children}</p>;
}
