"use client";

import { School } from "lucide-react";
import Link from "next/link";
import { useSelectedLayoutSegment } from "next/navigation";

import { toggleVariants } from "#/components/ui/toggle";
import { cn } from "#/lib/utils";
import type { AdminHubDetail } from "../queries";

export default function HubTabs({ hub }: { hub: AdminHubDetail }) {
  const activeTab = useSelectedLayoutSegment();
  const tabs = [{ segment: "schools", label: "Schools", icon: School, count: hub.schoolsCount }];

  return (
    <div className="flex overflow-x-auto">
      <nav aria-label="Hub sections" className="form-toggle flex items-center gap-1">
        {tabs.map(({ segment, label, icon: Icon, count }) => {
          const active = segment === activeTab;
          return (
            <Link
              key={segment}
              href={`/admin/hubs/${hub.id}/${segment}`}
              aria-current={active ? "page" : undefined}
              data-state={active ? "on" : "off"}
              className={cn(toggleVariants(), "form-toggle-button gap-2")}
            >
              <Icon aria-hidden className="hidden h-4 w-4 xl:block" />
              <span className="text-nowrap">{label}</span>
              <span className="rounded-md bg-background-secondary px-1.5 text-sm font-semibold tabular-nums">
                {count}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
