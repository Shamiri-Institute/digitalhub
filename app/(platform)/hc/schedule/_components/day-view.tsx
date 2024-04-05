"use client";

import { useRef } from "react";
import { useCalendarCell, useDateFormatter, useLocale } from "react-aria";
import { CalendarState } from "react-stately";

import { cn } from "#/lib/utils";
import { CalendarDate } from "@internationalized/date";
import { SessionList } from "./session-list";
import { useSessions } from "./sessions-provider";

export function DayView({ state }: { state: CalendarState }) {
  const ref = useRef();
  const { locale } = useLocale();
  const dayFormatter = useDateFormatter({ weekday: "long" });

  // Assuming you have a way to determine the current day
  console.log({ state });
  const currentDate = state.visibleRange.start;

  // 6 AM - 6 PM session scheduling window
  const hours = Array.from({ length: 13 }, (_, i) => 6 + i);

  function formatHour(hour: number) {
    const hourIn12HourFormat = hour % 12 === 0 ? 12 : hour % 12;
    const period = hour < 12 ? "AM" : "PM";
    return `${hourIn12HourFormat}:00 ${period}`;
  }

  return (
    <table className="block border-separate overflow-hidden rounded-[0.4375rem] border border-grey-border [border-spacing:0]">
      <thead className="block">
        <tr className="flex divide-x divide-grey-border border-b border-grey-border bg-grey-bg">
          <th className="w-[103px] px-4 py-3"></th>
          <th className="relative flex w-[141px] shrink-0 items-center justify-between px-4 py-3 text-left xl:w-[186px]">
            {currentDate.day} -{" "}
            {dayFormatter.format(currentDate.toDate(state.timeZone))}
          </th>
        </tr>
      </thead>
      <tbody className="block h-[700px] overflow-y-scroll">
        {hours.map((hour, rowIdx) => (
          <tr key={rowIdx} className="flex divide-x divide-grey-border">
            <td
              className={cn(
                "flex truncate border-t border-grey-border bg-grey-bg px-4 py-3 text-grey-c3",
                "h-[85px] xl:h-[112px]",
                "w-[103px]",
                "text-sm",
                {
                  "border-t-0": rowIdx === 0,
                },
              )}
            >
              {formatHour(hour)}
            </td>
            <CalendarCell
              rowIdx={rowIdx}
              hour={hour}
              date={currentDate}
              state={state}
            />
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function CalendarCell({
  rowIdx,
  hour,
  date,
  state,
}: {
  rowIdx: number;
  hour: number;
  date: CalendarDate;
  state: CalendarState;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { cellProps, buttonProps, isSelected, isDisabled, isUnavailable } =
    useCalendarCell({ date }, state, ref);

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
            { "border-t-0": rowIdx === 0 },
          )}
        >
          <SessionList sessions={sessions} />
        </div>
      </div>
    </td>
  );
}
