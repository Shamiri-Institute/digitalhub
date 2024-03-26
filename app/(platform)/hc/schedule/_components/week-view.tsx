import { createCalendar, isToday } from "@internationalized/date";
import { useEffect, useRef } from "react";
import {
  useCalendar,
  useCalendarGrid,
  useDateFormatter,
  useLocale,
} from "react-aria";
import { useCalendarState } from "react-stately";

import { cn } from "#/lib/utils";
import { useTitle } from "./title-provider";

export function WeekView() {
  const ref = useRef();
  const { locale } = useLocale();
  const state = useCalendarState({
    visibleDuration: { weeks: 1 },
    locale,
    createCalendar,
  });
  const { calendarProps, prevButtonProps, nextButtonProps } = useCalendar(
    {},
    state,
  );

  const { gridProps } = useCalendarGrid({ weekdayStyle: "long" }, state);

  const startDate = state.visibleRange.start;

  const dateFormatter = useDateFormatter({
    dateStyle: "long",
    calendar: startDate.calendar.identifier,
  });
  const dayFormatter = useDateFormatter({
    weekday: "long",
  });

  const { setTitle } = useTitle();
  useEffect(() => {
    setTitle(
      dateFormatter.formatRange(
        state.visibleRange.start.toDate(state.timeZone),
        state.visibleRange.end.toDate(state.timeZone),
      ),
    );
  }, [
    state.visibleRange.start,
    state.visibleRange.end,
    dateFormatter,
    setTitle,
    state.timeZone,
  ]);

  return (
    <table
      {...gridProps}
      className="border-separate overflow-hidden rounded-[0.4375rem] border border-grey-border [border-spacing:0]"
    >
      <thead>
        <tr className="divide-x divide-grey-border bg-grey-bg">
          <th className="w-[94px] px-4 py-3"></th>
          {state.getDatesInWeek(0).map((date, i) =>
            date ? (
              <th
                key={i}
                className={cn("px-4 py-3", {
                  "text-blue-base":
                    state.value && isToday(state.value, state.timeZone),
                })}
              >
                {date.day} - {dayFormatter.format(date.toDate(state.timeZone))}
              </th>
            ) : (
              <td key={i} />
            ),
          )}
        </tr>
      </thead>
      <tbody></tbody>
    </table>
  );
}
