"use client";

import { type CalendarDate, isToday } from "@internationalized/date";
import type { ImplementerRole } from "#/db/enums";
import { type Dispatch, type SetStateAction, useRef } from "react";
import { useCalendarCell, useDateFormatter } from "react-aria";
import type { CalendarState } from "react-stately";
import { Tooltip, TooltipContent, TooltipTrigger } from "#/components/ui/tooltip";
import { cn } from "#/lib/utils";
import { SessionList } from "./session-list";
import type { Session } from "#/lib/actions/fetch-sessions";
import { sessionsAt } from "#/lib/schedule-view";

export function DayView({
  state,
  role,
  dialogState,
  supervisorId,
  fellowId,
  sessions: allSessions,
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
    setCancelSessionDialog: Dispatch<SetStateAction<boolean>>;
    setSupervisorAttendanceDialog: Dispatch<SetStateAction<boolean>>;
  };
  supervisorId?: string;
  fellowId?: string;
  sessions: Session[];
}) {
  const dayFormatter = useDateFormatter({ weekday: "long" });

  const currentDate = state.visibleRange.start;

  // 6 AM - 6 PM session scheduling window
  const hours = Array.from({ length: 13 }, (_, i) => 6 + i);

  function formatHour(hour: number) {
    const hourIn12HourFormat = hour % 12 === 0 ? 12 : hour % 12;
    const period = hour < 12 ? "AM" : "PM";
    return `${hourIn12HourFormat}:00 ${period}`;
  }

  const headerLabel = `${currentDate.day} - ${dayFormatter.format(currentDate.toDate(state.timeZone))}`;

  const sessions = sessionsAt(allSessions, currentDate);
  const hasSessions = sessions.length > 0;

  return (
    <div className="w-full rounded-t-[0.4375rem] border">
      <table className="schedule-table sticky top-0 z-10 rounded-t-[0.4375rem] bg-white">
        <thead>
          <tr className="flex divide-x divide-grey-border border-b border-grey-border bg-grey-bg">
            <th className="time-cell hidden lg:block" />
            <th
              className={cn("relative flex shrink-0 items-center justify-between gap-2", {
                "text-blue-base": isToday(currentDate, state.timeZone),
              })}
            >
              {headerLabel}&#8203;
              {hasSessions && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-base" />
                  </TooltipTrigger>
                  <TooltipContent side="top">{sessions.length} sessions on this day</TooltipContent>
                </Tooltip>
              )}
            </th>
          </tr>
        </thead>
      </table>
      <table className="schedule-table rounded-b-[0.4375rem]">
        <tbody>
          {hours.map((hour, rowIdx) => (
            <tr key={hour}>
              <td
                className={cn(
                  "time-cell truncate",
                  "h-[85px] xl:h-[112px]",
                  "w-[103px] shrink-0",
                  "text-sm",
                )}
              >
                {formatHour(hour)}
              </td>
              <DayCalendarCell
                rowIdx={rowIdx}
                date={currentDate}
                state={state}
                role={role}
                dialogState={dialogState}
                fellowId={fellowId}
                supervisorId={supervisorId}
                sessions={sessionsAt(sessions, currentDate, hour)}
              />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DayCalendarCell({
  rowIdx,
  date,
  state,
  role,
  dialogState,
  fellowId,
  supervisorId,
  sessions,
}: {
  rowIdx: number;
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
    setCancelSessionDialog: Dispatch<SetStateAction<boolean>>;
    setSupervisorAttendanceDialog: Dispatch<SetStateAction<boolean>>;
  };
  fellowId?: string;
  supervisorId?: string;
  sessions: Session[];
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { cellProps, buttonProps, isSelected, isDisabled, isUnavailable } = useCalendarCell(
    { date },
    state,
    ref,
  );

  return (
    <td {...cellProps}>
      <div
        {...buttonProps}
        ref={ref}
        className={cn("h-full w-full", {
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
            "w-full",
            "border-t border-grey-border",
            { "border-t-0": rowIdx === 0 },
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
