"use client";

import { DateValue, createCalendar } from "@internationalized/date";
import { format } from "date-fns";
import React from "react";
import { useCalendar, useLocale } from "react-aria";
import type { CalendarProps } from "react-aria-components";
import {
  Button,
  Calendar,
  CalendarCell,
  CalendarGrid,
  CalendarGridBody,
  CalendarGridHeader,
  CalendarHeaderCell,
  CalendarStateContext,
  Heading,
} from "react-aria-components";
import { useCalendarState } from "react-stately";

import { Icons } from "#/components/icons";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "#/components/ui/popover";
import { Separator } from "#/components/ui/separator";
import { ToggleGroup, ToggleGroupItem } from "#/components/ui/toggle-group";

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

export default function HubCoordinatorSchedulePage() {
  return (
    <main className="px-[24px] pb-[24px] pt-[20px]">
      <ScheduleHeader sessions={20} fellows={14} cases={23} />
      <Separator className="my-5 bg-[#E8E8E8]" />
      <ScheduleCalendar />
    </main>
  );
}

function ScheduleHeader({
  sessions,
  fellows,
  cases,
}: {
  sessions: number;
  fellows: number;
  cases: number;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="text-[2.25rem] font-semibold text-black">Schedule</div>
      <div className="relative flex items-center justify-between divide-x divide-[#E8E8E8] self-stretch rounded-lg border border-[#E8E8E8] bg-[#F7F7F7] font-normal">
        <div className="flex w-28 flex-col items-center justify-center py-2">
          <div className="text-sm text-gray-500">Sessions</div>
          <div className="text-xl text-black">{sessions}</div>
        </div>
        <div className="flex w-28 flex-col items-center justify-center py-2">
          <div className="text-sm text-gray-500">Fellows</div>
          <div className="text-xl text-black">{fellows}</div>
        </div>
        <div className="flex w-28 flex-col items-center justify-center py-2">
          <div className="text-sm text-gray-500">Cases</div>
          <div className="text-xl text-black">{cases}</div>
        </div>
      </div>
    </div>
  );
}

function ScheduleCalendar(props: CalendarProps<DateValue>) {
  let { locale } = useLocale();
  let state = useCalendarState({
    ...props,
    locale,
    createCalendar,
  });

  let { calendarProps, prevButtonProps, nextButtonProps, title } = useCalendar(
    props,
    state,
  );

  return (
    <>
      <div className="flex gap-2">
        <div className="flex gap-6">
          <div className="text-2xl font-semibold leading-8">{title}</div>
          <NavigationButtons
            onNext={() => console.log("next")}
            onPrevious={() => console.log("previous")}
          />
        </div>
        <div className="mx-2">
          <ScheduleMode />
        </div>
      </div>
    </>
  );
}

function ScheduleMode() {
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

function NavigationButtons({
  onPrevious,
  onNext,
}: {
  onPrevious: () => void;
  onNext: () => void;
}) {
  return (
    <div
      className="inline-flex divide-x divide-gray-300 overflow-auto rounded-xl border border-gray-300 shadow"
      role="group"
    >
      <button
        className="inline-flex items-center bg-white px-2 py-1.5 text-sm font-medium text-gray-500 hover:bg-gray-50"
        onClick={onPrevious}
        aria-label="Previous Month"
      >
        <Icons.chevronLeft className="h-5 w-5" />
      </button>
      <button
        className="inline-flex items-center bg-white px-2 py-1.5 text-sm font-medium text-gray-500 hover:bg-gray-50"
        onClick={onNext}
        aria-label="Next Month"
      >
        <Icons.chevronRight className="h-5 w-5" />
      </button>
    </div>
  );
}

function HCSchedulePage() {
  let state = React.useContext(CalendarStateContext)!;
  return (
    <div className="px-[24px] pb-[24px] pt-[20px]">
      <h1>SDH Schedule</h1>
      <section>
        <Calendar aria-label="Session schedule">
          <header className="mb-2">
            <Button slot="previous">◀</Button>
            <Heading />
            <Button slot="next">▶</Button>
          </header>
          <CalendarGrid
            className="border-separate border-spacing-0"
            weekdayStyle="long"
          >
            <CalendarGridHeader>
              {(day) => (
                <CalendarHeaderCell className="border-l border-t border-[#E8E8E8] bg-[#F7F7F7] px-[16px] py-[12px] text-left first:rounded-tl-[7px] last:rounded-tr-[7px] last:border-r">
                  {day}
                </CalendarHeaderCell>
              )}
            </CalendarGridHeader>

            <CalendarGridBody>
              {(date) => (
                <CalendarCell date={date} className="m-0 p-0">
                  <div className="flex h-[144px] w-[198px] flex-col gap-[8px] overflow-y-scroll border-l border-t border-[#E8E8E8] px-[16px] py-[8px]">
                    <div>{format(date.toDate("GMT"), "dd")}</div>
                    {format(date.toDate("GMT"), "d") === "1" && (
                      <ExampleSession />
                    )}
                  </div>
                </CalendarCell>
              )}
            </CalendarGridBody>
          </CalendarGrid>
        </Calendar>
      </section>
    </div>
  );
}

function ExampleSession() {
  return (
    <Popover>
      <PopoverTrigger>session 1</PopoverTrigger>
      <PopoverContent className="w-[360px]">
        <input />
        <button onClick={() => console.log("button clicked")}>Click me</button>
      </PopoverContent>
    </Popover>
  );
}
