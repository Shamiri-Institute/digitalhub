"use client";

import * as React from "react";

import { SchedulingDialog } from "#/app/(platform)/(dashboard)/scheduling-dialog";
import { cn } from "#/lib/utils";
import {
  addHours,
  eachDayOfInterval,
  endOfWeek,
  format,
  getHours,
  isToday,
  isWithinInterval,
  startOfWeek,
} from "date-fns";

interface SessionEvent {
  title: string;
  date: Date;
  duration: number;
}

export function SessionSchedule({ sessions }: { sessions: SessionEvent[] }) {
  const currentDate = new Date();

  const currentWeekStart = startOfWeek(currentDate);
  const currentWeekEnd = endOfWeek(currentDate);

  const firstSessionStartDate = sessions[0]?.date!;
  const firstSessionStartHour = getHours(firstSessionStartDate);
  const threeHoursBeforeStartHour = new Date(currentDate);
  threeHoursBeforeStartHour.setHours(firstSessionStartHour - 3);
  const lastSessionEndDate = new Date(sessions[sessions.length - 1]?.date!);
  const lastSessionEndHour = getHours(lastSessionEndDate);
  const threeHoursAfterEndHour = new Date(currentDate);
  threeHoursAfterEndHour.setHours(lastSessionEndHour + 3);

  let scheduleHoursRange: number[] = [];
  for (
    let i = firstSessionStartHour - 3;
    i <= lastSessionEndHour + 3 + 1;
    i++
  ) {
    scheduleHoursRange.push(i);
  }
  console.debug({
    firstSessionStartHour,
    lastSessionEndHour,
    scheduleHoursRange,
  });

  const thisWeekSessions = sessions.filter((session) =>
    isWithinInterval(session.date, {
      start: currentWeekStart,
      end: currentWeekEnd,
    }),
  );
  console.log({
    date: sessions[0]!.date,
    currentWeekStart,
    currentWeekEnd,
    thisWeekSessions,
  });

  const daysOfWeek = eachDayOfInterval({
    start: currentWeekStart,
    end: currentWeekEnd,
  }).map((date) => ({
    dayOfMonth: format(date, "d"),
    dayName: format(date, "EEEEE"),
    isToday: isToday(date),
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

  return (
    <div className="max-w-4xl rounded-md bg-white shadow-md">
      <div className="rounded-t-md bg-active-card text-white">
        <div className="p-4 pb-0 font-semibold">
          <span>{format(currentDate, "MMM yyyy")}</span>
        </div>
        <div className="mt-2 grid grid-cols-7 gap-1 px-1 text-center">
          {daysOfWeek.map(({ dayOfMonth, dayName, isToday }) => (
            <div
              key={dayOfMonth}
              className={cn(
                "flex flex-col items-center gap-px rounded-t-md pb-2.5 pt-1 text-left",
                {
                  "bg-white text-active-card": isToday,
                },
              )}
            >
              <span className="font-semibold">{dayOfMonth}</span>
              <span
                className={cn("text-blue-300/80", {
                  "text-gray-800": isToday,
                })}
              >
                {dayName}
              </span>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-4 grid grid-rows-5 gap-2 overflow-scroll">
        {scheduleHoursRange.map((hour) =>
          thisWeekSessions.map((session, index) => {
            const isSessionThisHour = session.date.getHours() === hour;
            console.debug({ isSessionThisHour, hour });
            return (
              <div key={index} className="flex h-20 justify-between gap-2">
                <span className="w-20 px-4 text-right font-medium">
                  {format(new Date().setHours(hour), "h a")}
                </span>

                <div className="relative flex-1 border-t border-gray-300/50">
                  {isSessionThisHour && (
                    <SchedulingDialog>
                      <button
                        ref={firstSession}
                        className="absolute top-1/2 z-20 ml-[10%] h-full w-fit cursor-pointer rounded-md bg-active-card px-8 py-2 text-white transition-all active:scale-90"
                      >
                        <h2 className="font-semibold">{session.title}</h2>
                        <span className="text-sm">
                          {format(session.date, "h:mm a")} -{" "}
                          {format(
                            addHours(session.date, session.duration),
                            "h:mm a",
                          )}
                        </span>
                      </button>
                    </SchedulingDialog>
                  )}
                </div>
              </div>
            );
          }),
        )}
      </div>
    </div>
  );
}
