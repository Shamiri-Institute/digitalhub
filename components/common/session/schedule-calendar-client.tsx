"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import { ScheduleCalendarSkeleton } from "./schedule-calendar-skeleton";

const ScheduleCalendarLazy = dynamic(
  () => import("#/components/common/session/schedule-calendar").then((mod) => mod.ScheduleCalendar),
  {
    ssr: false,
    loading: () => <ScheduleCalendarSkeleton />,
  },
);

type ScheduleCalendarProps = ComponentProps<typeof ScheduleCalendarLazy>;

export function ScheduleCalendarClient(props: ScheduleCalendarProps) {
  return <ScheduleCalendarLazy {...props} />;
}
