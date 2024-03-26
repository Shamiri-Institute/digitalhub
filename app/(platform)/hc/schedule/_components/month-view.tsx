import { CalendarDate, getWeeksInMonth } from "@internationalized/date";
import { useRef } from "react";
import { useCalendarCell, useCalendarGrid, useLocale } from "react-aria";
import type { CalendarGridProps } from "react-aria-components";
import { CalendarState } from "react-stately";

import { cn } from "#/lib/utils";

import { SessionList } from "./session-list";
import { useSessions } from "./sessions-provider";

export function MonthView({
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

export function CalendarCell({
  state,
  date,
}: {
  state: CalendarState;
  date: CalendarDate;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const {
    cellProps,
    buttonProps,
    isSelected,
    isOutsideVisibleRange,
    isDisabled,
    isUnavailable,
    formattedDate,
  } = useCalendarCell({ date }, state, ref);

  const { sessions } = useSessions({ date });

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
