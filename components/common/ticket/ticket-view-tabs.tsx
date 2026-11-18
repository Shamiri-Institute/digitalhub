"use client";

import Link from "next/link";

import { toggleVariants } from "#/components/ui/toggle";
import { cn } from "#/lib/utils";

export function TicketViewTabs({
  basePath,
  tabs,
}: {
  basePath: string;
  tabs: { view: string; label: string; count: number; active: boolean }[];
}) {
  return (
    <div data-tab-row className="flex overflow-x-auto max-lg:mask-r-from-85% max-lg:pr-12">
      <nav aria-label="Ticket views" className="form-toggle flex items-center gap-1">
        {tabs.map((tab) => (
          <Link
            key={tab.view}
            href={tab.view === "all" ? basePath : `${basePath}?view=${tab.view}`}
            aria-current={tab.active ? "page" : undefined}
            data-state={tab.active ? "on" : "off"}
            className={cn(toggleVariants(), "form-toggle-button gap-2")}
          >
            <span className="text-nowrap">{tab.label}</span>
            <span
              className={cn(
                "rounded-md px-1.5 text-sm font-semibold tabular-nums",
                tab.active
                  ? "bg-blue-bg text-shamiri-new-blue"
                  : "bg-shamiri-light-grey text-shamiri-text-dark-grey",
              )}
            >
              {tab.count.toLocaleString("en-US")}
            </span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
