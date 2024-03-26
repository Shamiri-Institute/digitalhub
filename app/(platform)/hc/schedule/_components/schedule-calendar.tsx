"use client";

import {
  CalendarDate,
  DateValue,
  createCalendar,
  getWeeksInMonth,
} from "@internationalized/date";
import { type AriaButtonProps } from "@react-aria/button";
import { filterDOMProps } from "@react-aria/utils";
import React from "react";
import {
  useCalendar,
  useCalendarCell,
  useCalendarGrid,
  useLocale,
} from "react-aria";
import type { CalendarGridProps, CalendarProps } from "react-aria-components";
import { CalendarState, useCalendarState } from "react-stately";

import { Icons } from "#/components/icons";
import { cn } from "#/lib/utils";

import { ModeProvider } from "./mode-provider";
import { ScheduleModeToggle } from "./schedule-mode-toggle";
import { SessionList } from "./session-list";
import { Session, SessionsProvider, useSessions } from "./sessions-provider";

type ScheduleCalendarProps = CalendarProps<DateValue> & {
  sessions: Session[];
};

export function ScheduleCalendar(props: ScheduleCalendarProps) {
  const { sessions, ...calendarStateProps } = props;
  const { locale } = useLocale();
  const state = useCalendarState({
    ...calendarStateProps,
    locale,
    createCalendar,
  });

  const { calendarProps, prevButtonProps, nextButtonProps, title } =
    useCalendar(calendarStateProps, state);

  return (
    <SessionsProvider sessions={sessions}>
      <ModeProvider>
        <div className="flex gap-2">
          <div className="flex gap-6">
            <div className="text-2xl font-semibold leading-8">{title}</div>
            <NavigationButtons
              prevProps={prevButtonProps}
              nextProps={nextButtonProps}
            />
          </div>
          <div className="mx-2">
            <ScheduleModeToggle />
          </div>
        </div>
        <div className="mt-4">
          <CalendarGrid state={state} weekdayStyle="long" />
        </div>
      </ModeProvider>
    </SessionsProvider>
  );
}

function CalendarGrid({
  state,
  ...props
}: {
  state: CalendarState;
  weekdayStyle: CalendarGridProps["weekdayStyle"];
}) {
  const { locale } = useLocale();
  const { gridProps, headerProps, weekDays } = useCalendarGrid(props, state);

  const weeksInMonth = getWeeksInMonth(state.visibleRange.start, locale);

  return (
    <table
      {...gridProps}
      className="border-separate overflow-hidden rounded-[0.4375rem] border border-grey-border [border-spacing:0]"
    >
      <thead {...headerProps}>
        <tr className="divide-x divide-grey-border bg-grey-bg">
          {weekDays.map((day, index) => (
            <th key={index} className="px-4 py-3 text-left">
              {day}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {Array.from(new Array(weeksInMonth).keys()).map((weekIndex) => (
          <tr key={weekIndex} className="divide-x divide-grey-border">
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
  date: CalendarDate;
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

  const { sessions } = useSessions(date);

  return (
    <td {...cellProps} className="p-0">
      <div
        {...buttonProps}
        ref={ref}
        className={cn("cell", {
          selected: isSelected,
          disabled: isDisabled,
          unavailable: isUnavailable,
        })}
      >
        <div
          className={cn(
            "flex flex-col gap-[8px] overflow-y-scroll",
            "px-[10px] py-[4px] xl:px-[16px] xl:py-[8px]",
            "h-[120px] xl:h-[144px]",
            "w-[165px] xl:w-[198px]",
            "border-t border-grey-border",
          )}
        >
          <div
            className={cn({
              "text-grey-c3": isOutsideVisibleRange,
            })}
          >
            {formattedDate}
          </div>
          <SessionList sessions={sessions} />
        </div>
      </div>
    </td>
  );
}

function NavigationButtons({
  prevProps,
  nextProps,
}: {
  prevProps: AriaButtonProps;
  nextProps: AriaButtonProps;
}) {
  return (
    <div
      className="inline-flex divide-x divide-gray-300 overflow-auto rounded-xl border border-gray-300 shadow"
      role="group"
    >
      <button
        className="inline-flex items-center bg-white px-2 py-1.5 text-sm font-medium text-gray-500 hover:bg-gray-50"
        aria-label="Previous Month"
        {...filterDOMProps(prevProps)}
      >
        <Icons.chevronLeft className="h-5 w-5" />
      </button>
      <button
        className="inline-flex items-center bg-white px-2 py-1.5 text-sm font-medium text-gray-500 hover:bg-gray-50"
        aria-label="Next Month"
        {...filterDOMProps(nextProps)}
      >
        <Icons.chevronRight className="h-5 w-5" />
      </button>
    </div>
  );
}
