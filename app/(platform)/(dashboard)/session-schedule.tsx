"use client";

import * as React from "react";

import { SchedulingDialog } from "#/app/(platform)/(dashboard)/scheduling-dialog";
import { cn } from "#/lib/utils";
import {
  eachDayOfInterval,
  endOfWeek,
  format,
  isToday,
  isWithinInterval,
  startOfWeek,
} from "date-fns";

interface SessionEvent {
  title: string;
  date: Date;
  startTime: string;
  endTime: string;
}

export function SessionSchedule({ sessions }: { sessions: SessionEvent[] }) {
  const currentDate = new Date();

  const currentWeekStart = startOfWeek(currentDate);
  const currentWeekEnd = endOfWeek(currentDate);

  const thisWeekSessions = sessions.filter((session) =>
    isWithinInterval(session.date, {
      start: currentWeekStart,
      end: currentWeekEnd,
    }),
  );

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
      <div className="mt-4 grid max-h-96 grid-rows-5 gap-2 overflow-scroll">
        {[6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18].map((hour) =>
          sessions.map((session, index) => {
            const isSessionThisHour = session.date.getHours() === hour;
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
                          {session.startTime} - {session.endTime}
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
