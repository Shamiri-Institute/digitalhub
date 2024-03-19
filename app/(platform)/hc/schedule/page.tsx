"use client";

import {
  DateValue,
  createCalendar,
  getWeeksInMonth,
} from "@internationalized/date";
import { format } from "date-fns";
import React from "react";
import {
  useCalendar,
  useCalendarCell,
  useCalendarGrid,
  useLocale,
} from "react-aria";
import type { CalendarProps } from "react-aria-components";
import { CalendarState, useCalendarState } from "react-stately";

import { Icons } from "#/components/icons";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "#/components/ui/popover";
import { Separator } from "#/components/ui/separator";
import { ToggleGroup, ToggleGroupItem } from "#/components/ui/toggle-group";
import { cn } from "#/lib/utils";

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
    <main className="max-w-[90rem] px-[24px] pb-[24px] pt-[20px]">
      <ScheduleHeader sessions={20} fellows={14} cases={23} />
      <Separator className="my-5 bg-[#E8E8E8]" />
      <ScheduleCalendar aria-label="Session schedule" />
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
            prevProps={prevButtonProps}
            nextProps={nextButtonProps}
          />
        </div>
        <div className="mx-2">
          <ScheduleMode />
        </div>
      </div>
      <div className="mt-4">
        <CalendarGrid state={state} weekdayStyle="long" />
      </div>
    </>
  );
}

function CalendarGrid({ state, ...props }: { state: CalendarState } & any) {
  const { locale } = useLocale();
  const { gridProps, headerProps, weekDays } = useCalendarGrid(props, state);

  const weeksInMonth = getWeeksInMonth(state.visibleRange.start, locale);

  return (
    <table
      {...gridProps}
      className="border-grey-border border-separate overflow-hidden rounded-[0.4375rem] border [border-spacing:0]"
    >
      <thead {...headerProps}>
        <tr className="divide-grey-border bg-grey-bg divide-x">
          {weekDays.map((day, index) => (
            <th key={index} className="px-4 py-3 text-left">
              {day}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {Array.from(new Array(weeksInMonth).keys()).map((weekIndex) => (
          <tr key={weekIndex} className="divide-grey-border divide-x">
            {state
              .getDatesInWeek(weekIndex)
              .map((date, i) =>
                date ? (
                  <CalendarCell key={i} state={state} date={date} />
                ) : (
                  <td key={i} />
                ),
              )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function CalendarCell({
  state,
  date,
}: {
  state: CalendarState;
  date: DateValue;
}) {
  let ref = React.useRef(null);
  let {
    cellProps,
    buttonProps,
    isSelected,
    isOutsideVisibleRange,
    isDisabled,
    isUnavailable,
    formattedDate,
  } = useCalendarCell({ date }, state, ref);

  return (
    <td {...cellProps} className="p-0">
      <div
        {...buttonProps}
        ref={ref}
        className={`cell ${isSelected ? "selected" : ""} ${
          isDisabled ? "disabled" : ""
        } ${isUnavailable ? "unavailable" : ""}`}
      >
        <div
          className={cn(
            "flex flex-col gap-[8px] overflow-y-scroll",
            "px-[10px] py-[4px] xl:px-[16px] xl:py-[8px]",
            "h-[120px] xl:h-[144px]",
            "w-[165px] xl:w-[198px]",
            "border-grey-border border-t",
          )}
        >
          <div
            className={cn({
              "text-grey-c3": isOutsideVisibleRange,
            })}
          >
            {formattedDate}
          </div>
          {format(date.toDate("GMT"), "d") === "1" && <ExampleSession />}
        </div>
      </div>
    </td>
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

function ExampleSession() {
  return (
    <Popover>
      <PopoverTrigger>session 1</PopoverTrigger>
      <PopoverContent className="w-full max-w-xs">
        <input />
        <button onClick={() => console.log("button clicked")}>Click me</button>
      </PopoverContent>
    </Popover>
  );
}
