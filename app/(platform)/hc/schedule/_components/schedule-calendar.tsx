"use client";

import { DateValue, createCalendar } from "@internationalized/date";
import type { AriaButtonProps } from "@react-aria/button";
import { filterDOMProps } from "@react-aria/utils";
import { useCalendar, useLocale } from "react-aria";
import type { CalendarGridProps, CalendarProps } from "react-aria-components";
import { CalendarState, useCalendarState } from "react-stately";

import { Icons } from "#/components/icons";

import { DayView } from "./day-view";
import { ListView } from "./list-view";
import { ModeProvider, useMode } from "./mode-provider";
import { MonthView } from "./month-view";
import { ScheduleModeToggle } from "./schedule-mode-toggle";
import { Session, SessionsProvider } from "./sessions-provider";
import { TableView } from "./table-view";
import { TitleProvider, useTitle } from "./title-provider";
import { WeekView } from "./week-view";

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

  const { prevButtonProps, nextButtonProps, title } = useCalendar(
    calendarStateProps,
    state,
  );

  return (
    <SessionsProvider sessions={sessions}>
      <ModeProvider>
        <TitleProvider>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-6">
              <ScheduleTitle fallbackTitle={title} />
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
            <CalendarView
              monthProps={{ state, weekdayStyle: "long" }}
              weekProps={{}}
              dayProps={{}}
              listProps={{}}
              tableProps={{}}
            />
          </div>
        </TitleProvider>
      </ModeProvider>
    </SessionsProvider>
  );
}

function ScheduleTitle({ fallbackTitle }: { fallbackTitle: string }) {
  const { title } = useTitle();

  return (
    <div className="text-2xl font-semibold leading-8">
      {title || fallbackTitle}
    </div>
  );
}

function CalendarView({
  monthProps,
  weekProps,
  dayProps,
  listProps,
  tableProps,
}: {
  monthProps: {
    state: CalendarState;
    weekdayStyle: CalendarGridProps["weekdayStyle"];
  };
  weekProps: {};
  dayProps: {};
  listProps: {};
  tableProps: {};
}) {
  const { mode } = useMode();

  switch (mode) {
    case "month":
      return <MonthView {...monthProps} />;
    case "week":
      return <WeekView />;
    case "day":
      return <DayView {...dayProps} />;
    case "list":
      return <ListView {...listProps} />;
    case "table":
      return <TableView {...tableProps} />;
    default:
      throw new Error(`Invalid mode: ${mode}`);
  }
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
