"use client";

import {
  DateValue,
  createCalendar,
  getLocalTimeZone,
  today,
} from "@internationalized/date";
import type { AriaButtonProps } from "@react-aria/button";
import { useButton } from "@react-aria/button";
import { useFocusRing } from "@react-aria/focus";
import { mergeProps } from "@react-aria/utils";
import { useSearchParams } from "next/navigation";
import { useRef } from "react";
import { useCalendar, useLocale } from "react-aria";
import type { CalendarGridProps, CalendarProps } from "react-aria-components";
import { CalendarState, useCalendarState } from "react-stately";

import { Icons } from "#/components/icons";

import { DayView } from "./day-view";
import { ListView } from "./list-view";
import { ModeProvider, useMode, type Mode } from "./mode-provider";
import { MonthView } from "./month-view";
import { ScheduleModeToggle } from "./schedule-mode-toggle";
import { SessionsProvider, useSessions } from "./sessions-provider";
import { TableView } from "./table-view";
import { TitleProvider, useTitle } from "./title-provider";
import { WeekView } from "./week-view";

type ScheduleCalendarProps = CalendarProps<DateValue> & {
  hubId: string;
};

export function ScheduleCalendar(props: ScheduleCalendarProps) {
  const { hubId, ...calendarStateProps } = props;
  const { locale } = useLocale();

  const monthState = useCalendarState({
    ...calendarStateProps,
    value: today(getLocalTimeZone()),
    locale,
    createCalendar,
  });

  const weekState = useCalendarState({
    value: today(getLocalTimeZone()),
    visibleDuration: { weeks: 1 },
    locale,
    createCalendar,
  });

  const dayState = useCalendarState({
    value: today(getLocalTimeZone()),
    visibleDuration: { days: 1 },
    locale,
    createCalendar,
  });

  const month = useCalendar(calendarStateProps, monthState);

  const week = useCalendar(calendarStateProps, weekState);

  const day = useCalendar(calendarStateProps, dayState);

  const searchParams = useSearchParams();
  const mode = searchParams.get("mode") ?? "month";

  let title = "";
  let prevButtonProps: AriaButtonProps = {};
  let nextButtonProps: AriaButtonProps = {};
  switch (mode) {
    case "month":
      title = month.title;
      prevButtonProps = month.prevButtonProps;
      nextButtonProps = month.nextButtonProps;
      break;
    case "week":
      title = week.title;
      prevButtonProps = week.prevButtonProps;
      nextButtonProps = week.nextButtonProps;
      break;
    case "day":
      title = day.title;
      prevButtonProps = day.prevButtonProps;
      nextButtonProps = day.nextButtonProps;
      break;
    default:
      throw new Error(`Invalid mode: ${mode}`);
  }

  return (
    <SessionsProvider hubId={hubId}>
      <ModeProvider defaultMode={mode as Mode}>
        <TitleProvider>
          <div className="flex items-center justify-between">
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
            <SessionsLoader>
              <CreateSessionButton />
            </SessionsLoader>
          </div>
          <div className="w-full mt-4">
            <CalendarView
              monthProps={{ state: monthState, weekdayStyle: "long" }}
              weekProps={{ state: weekState }}
              dayProps={{ state: dayState }}
              listProps={{}}
              tableProps={{}}
            />
          </div>
        </TitleProvider>
      </ModeProvider>
    </SessionsProvider>
  );
}

function CreateSessionButton() {
  return (
    <button className="hover:bg-blue-dark flex items-center gap-2 rounded-md bg-blue-base px-3 py-2 text-white">
      <Icons.plusCircle className="h-5 w-5" />
      <span className="text-white">Schedule a session</span>
    </button>
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

function SessionsLoader({ children }: { children: React.ReactNode }) {
  const { loading } = useSessions({});

  if (loading) {
    return (
      <svg
        className="-ml-1 mr-6 h-5 w-5 animate-spin text-blue-base"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
    );
  }

  return <div className="h-9">{children}</div>;
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
  weekProps: {
    state: CalendarState;
  };
  dayProps: {
    state: CalendarState;
  };
  listProps: {};
  tableProps: {};
}) {
  const { mode } = useMode();

  switch (mode) {
    case "month":
      return <MonthView {...monthProps} />;
    case "week":
      return weekProps.state.value ? (
        <WeekView {...weekProps} />
      ) : (
        <div>Loading...</div>
      );
    case "day":
      return dayProps.state.value ? (
        <DayView {...dayProps} />
      ) : (
        <div>Loading...</div>
      );
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
      className="inline-flex divide-x divide-gray-300 overflow-auto rounded-xl border border-gray-300 shadow-sm"
      role="group"
    >
      <NavigationButton aria-label="Previous Month" {...prevProps}>
        <Icons.chevronLeft className="h-5 w-5" />
      </NavigationButton>

      <NavigationButton aria-label="Next Month" {...nextProps}>
        <Icons.chevronRight className="h-5 w-5" />
      </NavigationButton>
    </div>
  );
}

function NavigationButton({
  children,
  ...props
}: {
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const { buttonProps } = useButton(props, ref);
  const { focusProps, isFocusVisible } = useFocusRing();

  return (
    <button
      {...mergeProps(buttonProps, focusProps)}
      ref={ref}
      className={`inline-flex h-9 items-center bg-white px-2 py-1.5 text-sm font-medium text-gray-500 hover:bg-gray-50 focus:outline-0 ${
        isFocusVisible ? "ring-2 ring-blue-base ring-offset-2" : ""
      }`}
    >
      {children}
    </button>
  );
}
