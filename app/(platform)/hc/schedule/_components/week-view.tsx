import { CalendarDate, isToday } from "@internationalized/date";
import { useEffect, useRef } from "react";
import {
  useCalendar,
  useCalendarCell,
  useCalendarGrid,
  useDateFormatter,
  useLocale,
} from "react-aria";
import { CalendarState } from "react-stately";

import { cn } from "#/lib/utils";
import { SessionList } from "./session-list";
import { useSessions } from "./sessions-provider";
import { useTitle } from "./title-provider";

export function WeekView({ state }: { state: CalendarState }) {
  const ref = useRef();
  const { locale } = useLocale();
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

  // 6 AM - 6 PM session scheduling window
  const hours = Array.from({ length: 13 }, (_, i) => 6 + i);

  function formatHour(hour: number) {
    const hourIn12HourFormat = hour % 12 === 0 ? 12 : hour % 12;
    const period = hour < 12 ? "AM" : "PM";
    return `${hourIn12HourFormat}:00 ${period}`;
  }

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
                className={cn("px-4 py-3 text-left", {
                  "text-blue-base": isToday(date, state.timeZone), // FIXME: not working
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
      <tbody>
        {hours.map((hour, idx) => (
          <tr key={idx} className="divide-x divide-grey-border">
            <td className="flex truncate border-t border-grey-border bg-grey-bg px-4 py-3 text-grey-c3">
              {formatHour(hour)}
            </td>
            {state
              .getDatesInWeek(0)
              .map((date, idx) =>
                date ? (
                  <CalendarCell
                    key={idx}
                    hour={hour}
                    date={date}
                    state={state}
                  />
                ) : (
                  <td key={idx} />
                ),
              )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function CalendarCell({
  hour,
  date,
  state,
}: {
  hour: number;
  date: CalendarDate;
  state: CalendarState;
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

  const { sessions } = useSessions({ date, hour });

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
            "h-[85px] xl:h-[112px]",
            "w-[140px] xl:w-[185px]",
            "border-t border-grey-border",
          )}
        >
          <SessionList sessions={sessions} />
        </div>
      </div>
    </td>
  );
}
