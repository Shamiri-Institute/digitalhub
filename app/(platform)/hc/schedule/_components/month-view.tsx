import {
  CalendarDate,
  getWeeksInMonth,
  isSameDay,
  isWeekend,
} from "@internationalized/date";
import { useEffect, useRef } from "react";
import {
  useCalendarCell,
  useCalendarGrid,
  useDateFormatter,
  useLocale,
} from "react-aria";
import type { CalendarGridProps } from "react-aria-components";
import { CalendarState } from "react-stately";

import { cn } from "#/lib/utils";

import { SessionList } from "./session-list";
import { useSessions } from "./sessions-provider";
import { useTitle } from "./title-provider";

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

  const { setTitle } = useTitle();
  const titleFormatter = useDateFormatter({
    month: "long",
    year: "numeric",
  });
  useEffect(() => {
    if (state.value) {
      setTitle(`${titleFormatter.format(state.value.toDate(state.timeZone))}`);
    }
  }, [setTitle, state.timeZone, state.value, titleFormatter]);

  return (
    <table
      {...gridProps}
      className="w-full table-fixed border-separate overflow-hidden rounded-[0.4375rem] border border-grey-border [border-spacing:0]"
    >
      <thead {...headerProps}>
        <tr className="divide-x divide-grey-border bg-grey-bg">
          {weekDays.map((day, index) => (
            <th
              key={index}
              className={cn("px-4 py-3 text-left", {
                "bg-background-secondary": index === 0 || index === 6,
              })}
            >
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
                  <MonthCalendarCell
                    key={i}
                    state={state}
                    date={date}
                    weekend={isWeekend(date, "en-US")}
                  />
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

export function MonthCalendarCell({
  state,
  date,
  weekend,
}: {
  state: CalendarState;
  date: CalendarDate;
  weekend: boolean;
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
    <td
      {...cellProps}
      className={cn("table-cell border-t border-grey-border p-0", {
        "bg-background-secondary": weekend,
      })}
    >
      <div
        {...buttonProps}
        ref={ref}
        className={cn("cell w-full transition ease-in-out", {
          "outline outline-2 outline-shamiri-new-blue": isSameDay(
            date,
            state.focusedDate,
          ),
          selected: isSelected,
          disabled: isDisabled,
          unavailable: isUnavailable,
        })}
        onClick={() => {
          state.setFocusedDate(date);
        }}
      >
        <div
          className={cn(
            "flex flex-col gap-[8px] overflow-y-auto",
            "px-[10px] py-[4px] xl:px-[16px] xl:py-[8px]",
            "h-[120px] xl:h-[144px]",
          )}
        >
          <div
            className={cn("flex", {
              "text-grey-c3": isOutsideVisibleRange,
            })}
          >
            <div
              className={cn(
                "flex h-6 w-6 items-center justify-center rounded-full p-0.5",
                {
                  "bg-shamiri-new-blue text-white": isSameDay(
                    date,
                    state.focusedDate,
                  ),
                },
              )}
            >
              {formattedDate}
            </div>
          </div>
          <SessionList sessions={sessions} />
        </div>
      </div>
    </td>
  );
}
