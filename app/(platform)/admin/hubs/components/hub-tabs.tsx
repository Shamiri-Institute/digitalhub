"use client";

import {
  BriefcaseBusiness,
  CalendarDays,
  GraduationCap,
  School,
  Settings,
  UserCheck,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useSelectedLayoutSegment } from "next/navigation";

import { toggleVariants } from "#/components/ui/toggle";
import { cn } from "#/lib/utils";
import type { AdminHubDetail } from "../queries";

// The row scrolls sideways on narrow screens; this keeps the current tab in view without
// scrolling the page.
function centreInRow(tab: HTMLAnchorElement | null) {
  const row = tab?.closest("[data-tab-row]");
  if (!tab || !row) return;
  const tabOffset = tab.getBoundingClientRect().left - row.getBoundingClientRect().left;
  row.scrollLeft += tabOffset - (row.clientWidth - tab.offsetWidth) / 2;
}

export default function HubTabs({ hub }: { hub: AdminHubDetail }) {
  const activeTab = useSelectedLayoutSegment();
  const tabs = [
    { segment: "students", label: "Students", icon: GraduationCap, count: hub.studentsCount },
    { segment: "sessions", label: "Sessions", icon: CalendarDays, count: hub.sessionsCount },
    { segment: "schools", label: "Schools", icon: School, count: hub.schoolsCount },
    { segment: "supervisors", label: "Supervisors", icon: UserCheck, count: hub.supervisorsCount },
    { segment: "fellows", label: "Fellows", icon: Users, count: hub.fellowsCount },
    {
      segment: "hub-managers",
      label: "Hub managers",
      icon: BriefcaseBusiness,
      count: hub.hubManagersCount,
    },
    { segment: "settings", label: "Hub settings", icon: Settings, count: undefined },
  ];

  return (
    <div data-tab-row className="flex overflow-x-auto max-lg:mask-r-from-85% max-lg:pr-12">
      <nav aria-label="Hub sections" className="form-toggle flex items-center gap-1">
        {tabs.map(({ segment, label, icon: Icon, count }) => {
          const active = segment === activeTab;
          return (
            <Link
              key={segment}
              href={`/admin/hubs/${hub.id}/${segment}`}
              aria-current={active ? "page" : undefined}
              ref={active ? centreInRow : undefined}
              className={cn(toggleVariants(), "form-toggle-button gap-2")}
            >
              <Icon aria-hidden className="hidden h-4 w-4 xl:block" />
              <span className="text-nowrap">{label}</span>
              {count !== undefined && (
                <span
                  className={cn(
                    "rounded-md px-1.5 text-sm font-semibold tabular-nums",
                    active ? "bg-info-bg text-primary" : "bg-muted text-muted-foreground",
                  )}
                >
                  {count.toLocaleString("en-US")}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
