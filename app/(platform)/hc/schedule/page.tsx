import React from "react";

import { currentHubCoordinator } from "#/app/auth";
import { InvalidPersonnelRole } from "#/components/common/invalid-personnel-role";
import { Icons } from "#/components/icons";
import { Separator } from "#/components/ui/separator";
import { ToggleGroup, ToggleGroupItem } from "#/components/ui/toggle-group";
import { db } from "#/lib/db";

import { ScheduleCalendar } from "./_components/schedule-calendar";
import { ScheduleHeader } from "./_components/schedule-header";

type ISession = {
  kind: "Pre" | "S1" | "S2" | "S3" | "S4";
  duration: {
    start: string;
    end: string;
  };
  date: string;
  school: string;
  state: "occurred" | "upcoming" | "rescheduled" | "cancelled";
};

const sessions: ISession[] = [
  {
    kind: "Pre",
    duration: {
      start: "6:00AM",
      end: "7:30AM",
    },
    date: "2023-06-05",
    school: "Olympic Secondary School",
    state: "occurred",
  },
];

export default async function HubCoordinatorSchedulePage() {
  const coordinator = await currentHubCoordinator();
  if (!coordinator) {
    return <InvalidPersonnelRole role="hub-coordinator" />;
  }

  if (!coordinator.assignedHubId) {
    return <div>Hub cooridnator has no assigned hub</div>;
  }

  const sessions = await db.interventionSession.findMany({
    where: {
      school: {
        hubId: coordinator.assignedHubId,
      },
    },
  });

  return (
    <main className="max-w-[90rem] px-[24px] pb-[24px] pt-[20px]">
      <ScheduleHeader sessions={20} fellows={14} cases={23} />
      <Separator className="my-5 bg-[#E8E8E8]" />
      <ScheduleCalendar sessions={sessions} aria-label="Session schedule" />
    </main>
  );
}

export function ScheduleMode() {
  return (
    <ToggleGroup
      type="single"
      className="gap-0 divide-x divide-gray-300 overflow-hidden rounded-xl border border-gray-300 py-0 shadow"
    >
      <ToggleGroupItem
        value="day"
        aria-label="Toggle day"
        className="rounded-none border-0 text-base"
      >
        Day
      </ToggleGroupItem>
      <ToggleGroupItem
        value="week"
        aria-label="Toggle week"
        className="rounded-none border-0 text-base"
      >
        Week
      </ToggleGroupItem>
      <ToggleGroupItem
        value="month"
        aria-label="Toggle month"
        className="rounded-none border-0 text-base"
      >
        Month
      </ToggleGroupItem>
      <ToggleGroupItem
        value="list-view"
        aria-label="Toggle list view"
        className="rounded-none border-0 text-base"
      >
        List view
      </ToggleGroupItem>
    </ToggleGroup>
  );
}

export function NavigationButtons({
  prevProps,
  nextProps,
}: {
  prevProps: React.ButtonHTMLAttributes<HTMLButtonElement>;
  nextProps: React.ButtonHTMLAttributes<HTMLButtonElement>;
}) {
  return (
    <div
      className="inline-flex divide-x divide-gray-300 overflow-auto rounded-xl border border-gray-300 shadow"
      role="group"
    >
      <button
        className="inline-flex items-center bg-white px-2 py-1.5 text-sm font-medium text-gray-500 hover:bg-gray-50"
        aria-label="Previous Month"
        {...prevProps}
      >
        <Icons.chevronLeft className="h-5 w-5" />
      </button>
      <button
        className="inline-flex items-center bg-white px-2 py-1.5 text-sm font-medium text-gray-500 hover:bg-gray-50"
        aria-label="Next Month"
        {...nextProps}
      >
        <Icons.chevronRight className="h-5 w-5" />
      </button>
    </div>
  );
}
