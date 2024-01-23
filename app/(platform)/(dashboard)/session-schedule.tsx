"use client";

import * as React from "react";

import { Icons } from "#/components/icons";
import { cn } from "#/lib/utils";
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

interface SessionEvent {
  title: string;
  date: Date;
  duration: number;
}

export function SessionSchedule({ sessions }: { sessions: SessionEvent[] }) {
  const [anchorDate, setAnchorDate] = React.useState<Date>(
    new Date("2023-05-17"),
  );
  const anchorWeekStart = startOfWeek(anchorDate);
  const anchorWeekEnd = endOfWeek(anchorDate);

  const firstSessionStartDate = sessions[0]?.date!;
  const firstSessionStartHour = getHours(firstSessionStartDate);
  const threeHoursBeforeStartHour = new Date(anchorDate);
  threeHoursBeforeStartHour.setHours(firstSessionStartHour - 3);
  const lastSessionEndDate = new Date(sessions[sessions.length - 1]?.date!);
  const lastSessionEndHour = getHours(lastSessionEndDate);
  const threeHoursAfterEndHour = new Date(anchorDate);
  threeHoursAfterEndHour.setHours(lastSessionEndHour + 3);

  const calendarBuffer = 1;
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
          {daysOfWeek.map(({ date, dayOfMonth, dayName, isAnchorDay }) => (
            <div
              key={dayOfMonth}
              className={cn(
                "flex cursor-pointer flex-col items-center gap-px rounded-t-md pb-2.5 pt-1 text-left",
                {
                  "bg-white text-active-card": isAnchorDay,
                },
              )}
              onClick={() => setAnchorDate(date)}
            >
              <span className="font-semibold">{dayOfMonth}</span>
              <span
                className={cn("text-blue-300/80", {
                  "text-gray-800": isAnchorDay,
                })}
              >
                {dayName}
              </span>
            </div>
          ))}
        </div>
      </div>
      <div
        className={cn(
          "relative mt-4 grid gap-2 overflow-scroll overflow-x-hidden",
          {
            "grid-rows-5": todaySessions.length,
          },
        )}
      >
        {todaySessions.map(({ sessions }) => {
          return sessions.map((session, idx) => {
            return (
              <div
                key={session.title}
                className="absolute z-20 ml-[12.5%]"
                style={{
                  top: `${
                    session.offsetFromStartHour *
                    (calendarHourHeight + calendarHourGap)
                  }px`,
                  left: `${idx * calendarHourWidth}px`,
                }}
              >
                <button className="h-full w-fit cursor-pointer rounded-md bg-active-card px-4 py-2 text-white transition-all active:scale-90">
                  <h2 className="font-semibold">{session.title}</h2>
                  <span className="text-sm">
                    {format(session.date, "h:mm a")} -{" "}
                    {format(addHours(session.date, session.duration), "h:mm a")}
                  </span>
                </button>
              </div>
            );
          });
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
