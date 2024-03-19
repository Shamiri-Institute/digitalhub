"use client";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "#/components/ui/popover";
import { getCalendarDate } from "#/lib/date-utils";
import { cn } from "#/lib/utils";
import {
  CalendarDate,
  DateValue,
  createCalendar,
  getWeeksInMonth,
  isSameDay,
} from "@internationalized/date";
import { Prisma } from "@prisma/client";
import React, { createContext, useContext } from "react";
import {
  useCalendar,
  useCalendarCell,
  useCalendarGrid,
  useLocale,
} from "react-aria";
import type { CalendarGridProps, CalendarProps } from "react-aria-components";
import { CalendarState, useCalendarState } from "react-stately";
import { NavigationButtons, ScheduleMode } from "../page";

type ScheduleCalendarProps = CalendarProps<DateValue> & {
  sessions: Prisma.InterventionSessionGetPayload<{}>[];
};

type SessionsContextType = {
  sessions: Prisma.InterventionSessionGetPayload<{}>[];
};

const SessionsContext = createContext<SessionsContextType | undefined>(
  undefined,
);

function SessionsProvider({
  children,
  sessions,
}: React.PropsWithChildren<{
  sessions: Prisma.InterventionSessionGetPayload<{}>[];
}>) {
  return (
    <SessionsContext.Provider value={{ sessions }}>
      {children}
    </SessionsContext.Provider>
  );
}

function useSessions(date: CalendarDate) {
  const context = useContext(SessionsContext);
  if (context === undefined) {
    throw new Error("useSessions must be used within a SessionsProvider");
  }

  const { sessions } = context;

  const filteredSessions = sessions.filter((session) => {
    return isSameDay(date, getCalendarDate(session.sessionDate));
  });

  return {
    sessions: filteredSessions,
  };
}

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
    </SessionsProvider>
  );
}
export function CalendarGrid({
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

function SessionList({
  sessions,
}: {
  sessions: Prisma.InterventionSessionGetPayload<{}>[];
}) {
  if (sessions.length === 0) {
    return null;
  }
  return (
    <Popover>
      <PopoverTrigger>
        {sessions.map((sess) => (
          <div key={sess.id}>{sess.sessionName}</div>
        ))}
      </PopoverTrigger>
      <PopoverContent className="w-full max-w-xs">
        <input />
        <button onClick={() => console.log("button clicked")}>Click me</button>
      </PopoverContent>
    </Popover>
  );
}
