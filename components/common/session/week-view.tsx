import { CalendarDate, isToday } from "@internationalized/date";
import { Dispatch, SetStateAction, useEffect, useRef } from "react";
import { useCalendarCell, useCalendarGrid, useDateFormatter } from "react-aria";
import { CalendarState } from "react-stately";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "#/components/ui/tooltip";
import { cn } from "#/lib/utils";

import { useGSAP } from "@gsap/react";
import { ImplementerRole } from "@prisma/client";
import gsap from "gsap";
import { SessionList } from "./session-list";
import { Session, useSessions } from "./sessions-provider";
import { useTitle } from "./title-provider";

export function WeekView({
  state,
  role,
  dialogState,
  supervisorId,
  fellowId,
}: {
  state: CalendarState;
  role: ImplementerRole;
  dialogState: {
    setSession: Dispatch<SetStateAction<Session | null>>;
    setFellowAttendanceDialog: Dispatch<SetStateAction<boolean>>;
    setStudentAttendanceDialog: Dispatch<SetStateAction<boolean>>;
    setRatingsDialog: Dispatch<SetStateAction<boolean>>;
    setSessionOccurrenceDialog: Dispatch<SetStateAction<boolean>>;
    setRescheduleSessionDialog: Dispatch<SetStateAction<boolean>>;
  };
  supervisorId?: string;
  fellowId?: string;
}) {
  const headerRowRef: any = useRef(null);
  const { gridProps, headerProps } = useCalendarGrid(
    { weekdayStyle: "long" },
    state,
  );

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

  useGSAP(
    () => {
      let mm = gsap.matchMedia();

      mm.add("(min-width: 768px)", () => {
        if (headerRowRef?.current) {
          gsap.timeline({
            scrollTrigger: {
              trigger: headerRowRef.current,
              start: "top top",
              end: "+=100%",
              scrub: true,
              pin: true,
              pinSpacing: false,
              // markers: true,
            },
          });
        }
      });

      return () => mm.revert(); // Clean up on unmount
    },
    { scope: headerRowRef },
  );

  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[0.4375rem] shadow-inner-2 lg:hidden"></div>
      <div className="no-scrollbar w-full overflow-x-scroll rounded-t-[0.4375rem] border">
        <table
          ref={headerRowRef}
          className="schedule-table z-10 rounded-t-[0.4375rem]"
        >
          <thead {...headerProps}>
            <tr className="border-b border-grey-border">
              <th className="time-cell"></th>
              {state
                .getDatesInWeek(0)
                .map((date, i) =>
                  date ? (
                    <WeekCalendarHeaderCell
                      key={i}
                      colIdx={i}
                      date={date}
                      state={state}
                      dayFormatter={dayFormatter}
                    />
                  ) : (
                    <td key={i} />
                  ),
                )}
            </tr>
          </thead>
        </table>
        <table {...gridProps} className="schedule-table rounded-b-[0.4375rem]">
          <tbody className="w-full">
            {hours.map((hour, rowIdx) => (
              <tr
                key={rowIdx}
                className="table-row w-full divide-x divide-grey-border"
              >
                <td
                  className={cn(
                    "time-cell truncate",
                    "h-[85px] xl:h-[112px]",
                    "w-[103px]",
                    "bg-background-secondary text-sm",
                  )}
                >
                  <div className="flex">{formatHour(hour)}</div>
                </td>
                {state
                  .getDatesInWeek(0)
                  .map((date, colIdx) =>
                    date ? (
                      <WeekCalendarCell
                        key={colIdx}
                        colIdx={colIdx}
                        rowIdx={rowIdx}
                        hour={hour}
                        date={date}
                        state={state}
                        role={role}
                        dialogState={dialogState}
                        fellowId={fellowId}
                        supervisorId={supervisorId}
                      />
                    ) : (
                      <td key={colIdx} />
                    ),
                  )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function WeekCalendarHeaderCell({
  date,
  state,
  dayFormatter,
  colIdx,
}: {
  date: CalendarDate;
  state: CalendarState;
  dayFormatter: any;
  colIdx: number;
}) {
  const { sessions } = useSessions({ date });
  const hasSessions = sessions.length > 0;
  return date ? (
    <th
      className={cn("relative px-4 py-3 text-left", {
        "text-blue-base": isToday(date, state.timeZone),
        "bg-background-secondary": colIdx === 0 || colIdx === 6,
      })}
    >
      {date.day} - {dayFormatter.format(date.toDate(state.timeZone))}
      {hasSessions && (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="h-1.5 w-1.5 rounded-full bg-blue-base"></span>
          </TooltipTrigger>
          <TooltipContent side="top">
            {sessions.length} sessions on this day
          </TooltipContent>
        </Tooltip>
      )}
    </th>
  ) : (
    <td />
  );
}

function WeekCalendarCell({
  rowIdx,
  colIdx,
  hour,
  date,
  state,
  role,
  dialogState,
  fellowId,
  supervisorId,
}: {
  rowIdx: number;
  colIdx: number;
  hour: number;
  date: CalendarDate;
  state: CalendarState;
  role: ImplementerRole;
  dialogState: {
    setSession: Dispatch<SetStateAction<Session | null>>;
    setFellowAttendanceDialog: Dispatch<SetStateAction<boolean>>;
    setStudentAttendanceDialog: Dispatch<SetStateAction<boolean>>;
    setRatingsDialog: Dispatch<SetStateAction<boolean>>;
    setSessionOccurrenceDialog: Dispatch<SetStateAction<boolean>>;
    setRescheduleSessionDialog: Dispatch<SetStateAction<boolean>>;
  };
  fellowId?: string;
  supervisorId?: string;
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
    <td {...cellProps}>
      <div
        {...buttonProps}
        ref={ref}
        className={cn("h-full w-full transition ease-in-out", {
          selected: isSelected,
          disabled: isDisabled,
          unavailable: isUnavailable,
        })}
      >
        <div
          className={cn(
            "flex flex-col gap-[8px] overflow-y-auto",
            "px-[10px] py-[4px] xl:px-[16px] xl:py-[8px]",
            "h-full lg:h-[85px] xl:h-[112px]",
            "border-t border-grey-border",
            {
              "bg-background-secondary": colIdx === 0 || colIdx === 6,
            },
          )}
        >
          <SessionList
            sessions={sessions}
            role={role}
            dialogState={dialogState}
            fellowId={fellowId}
            supervisorId={supervisorId}
          />
        </div>
      </div>
    </td>
  );
}
