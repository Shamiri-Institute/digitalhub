"use client";

import {
  addDays,
  addHours,
  eachDayOfInterval,
  endOfWeek,
  format,
  getHours,
  isSameDay,
  startOfWeek,
} from "date-fns";
import Link from "next/link";
import * as React from "react";

import { Icons } from "#/components/icons";
import { cn } from "#/lib/utils";

interface SessionEvent {
  title: string;
  date: Date;
  duration: number;
  schoolHref: string;
}

export function SessionSchedule({ sessions }: { sessions: SessionEvent[] }) {
  const [anchorDate, setAnchorDate] = React.useState<Date>(new Date());
  const anchorWeekStart = startOfWeek(anchorDate);
  const anchorWeekEnd = endOfWeek(anchorDate);

  const calendarBuffer = 1;
  const firstSessionStartDate = sessions[0]?.date!;
  const firstSessionStartHour = getHours(firstSessionStartDate);
  const startHourMinusBuffer = new Date(anchorDate);
  startHourMinusBuffer.setHours(firstSessionStartHour - calendarBuffer);
  const lastSessionEndDate = new Date(sessions[sessions.length - 1]?.date!);
  const lastSessionEndHour = getHours(lastSessionEndDate);
  const endHourPlusBuffer = new Date(anchorDate);
  endHourPlusBuffer.setHours(lastSessionEndHour + calendarBuffer);

  let scheduleHoursRange: number[] = [];
  for (
    let i = firstSessionStartHour - calendarBuffer;
    i <= lastSessionEndHour + calendarBuffer + 1;
    i++
  ) {
    scheduleHoursRange.push(i);
  }

  type CalendarSession = {
    title: string;
    date: Date;
    duration: number;
    offsetFromStartHour: number;
    hourCount: number;
    schoolHref: string;
  };
  const todaySessions: {
    hour: number;
    sessions: CalendarSession[];
  }[] = scheduleHoursRange.map((hour) => {
    const sessionsInHour = sessions
      .filter(
        (session) =>
          isSameDay(session.date, anchorDate) &&
          session.date.getHours() === hour,
      )
      .map((session) => {
        const offsetFromStartHour =
          hour - (firstSessionStartHour - calendarBuffer);
        return {
          ...session,
          offsetFromStartHour,
          hourCount: 1,
          schoolHref: session.schoolHref,
        };
      });

    return {
      hour,
      sessions: sessionsInHour,
    };
  });

  console.log({ todaySessions });

  const daysOfWeek = eachDayOfInterval({
    start: anchorWeekStart,
    end: anchorWeekEnd,
  }).map((date) => ({
    date,
    dayOfMonth: format(date, "d"),
    dayName: format(date, "EEEEE"),
    isAnchorDay: format(date, "d") === format(anchorDate, "d"),
  }));

  const firstSession = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    if (firstSession.current) {
      firstSession.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, []);

  const calendarHourHeight = 80;
  const calendarHourGap = 8;
  const calendarHourWidth = 240;

  return (
    <div className="max-w-4xl rounded-md bg-white shadow-md">
      <div className="rounded-t-md bg-active-card text-white">
        <div className="flex items-center justify-between">
          <div className="p-4 pb-0 font-semibold">
            <span>{format(anchorDate, "MMM yyyy")}</span>
          </div>
          <div></div>
          <div className="flex items-center gap-2 p-4 pb-0">
            <button
              className="rounded-full bg-active-card p-1.5 text-white transition-transform hover:bg-white/20 active:scale-95"
              onClick={() => setAnchorDate(addDays(anchorDate, -7))}
            >
              <Icons.chevronLeft />
            </button>
            <button
              className="rounded-full bg-active-card p-1.5 text-white transition-transform hover:bg-white/20 active:scale-95"
              onClick={() => setAnchorDate(addDays(anchorDate, 7))}
            >
              <Icons.chevronRight />
            </button>
          </div>
        </div>
        <div className="mt-2 grid grid-cols-7 gap-1 px-1 text-center">
          {daysOfWeek.map(({ date, dayOfMonth, dayName, isAnchorDay }) => {
            const hasSessions = sessions.some((session) =>
              isSameDay(session.date, date),
            );
            return (
              <div
                key={dayOfMonth}
                className={cn(
                  "relative flex cursor-pointer flex-col items-center gap-px rounded-t-md pb-2.5 pt-1 text-left",
                  {
                    "bg-white text-active-card": isAnchorDay,
                  },
                )}
                onClick={() => setAnchorDate(date)}
              >
                <span className="font-semibold">{dayOfMonth}</span>
                {hasSessions && (
                  <span
                    className={cn(
                      "absolute bottom-2 inline-block h-1 w-1 rounded-full bg-white/50",
                      {
                        "bg-shamiri-dark-blue/90": isAnchorDay,
                      },
                    )}
                  ></span>
                )}
                <span
                  className={cn("text-blue-300/80", {
                    "text-gray-800": isAnchorDay,
                  })}
                >
                  {dayName}
                </span>
              </div>
            );
          })}
        </div>
      </div>
      <div className={cn("relative mt-4 overflow-scroll overflow-x-hidden")}>
        {todaySessions.map(({ hour, sessions }) => {
          const sessionOffsetFromHour = sessions[0]?.offsetFromStartHour ?? 0;
          return (
            <div
              key={hour}
              className="absolute z-20 ml-[20%] flex gap-2 lg:ml-[12.5%] lg:gap-6"
              style={{
                top: `${
                  sessionOffsetFromHour * (calendarHourHeight + calendarHourGap)
                }px`,
              }}
            >
              {sessions.map((session, idx) => {
                return (
                  <Link
                    key={session.title}
                    href={session.schoolHref}
                    style={{ height: calendarHourHeight * 0.9 }}
                  >
                    <div className="h-full w-fit cursor-pointer rounded-md bg-active-card px-2 py-1 pb-2 text-white transition-all active:scale-90 lg:px-4 lg:py-2">
                      <h2 className="text-sm font-semibold md:text-base">
                        {session.title}
                      </h2>
                      <span className="text-xs md:text-sm">
                        {format(session.date, "h:mm a")} -{" "}
                        {format(
                          addHours(session.date, session.duration),
                          "h:mm a",
                        )}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          );
        })}
        {scheduleHoursRange.map((hour) => (
          <div
            key={hour}
            className="flex justify-between"
            style={{ height: calendarHourHeight, gap: calendarHourGap }}
          >
            <div className="w-20 px-4 pt-2 text-right font-medium">
              {format(new Date().setHours(hour), "h a")}
            </div>
            <div className="relative flex-1 border-t border-gray-300/50"></div>
          </div>
        ))}
      </div>
    </div>
  );
}
