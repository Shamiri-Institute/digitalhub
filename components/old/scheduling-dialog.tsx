"use client";

import { format } from "date-fns";
import type * as React from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "#/components/ui/sheet";

export function SchedulingDialog({ children }: { children: React.ReactNode }) {
  const sessions = [
    {
      title: "Pre session",
      date: new Date("2024-11-03T19:30:00Z"),
    },
    {
      title: "Session 01",
      date: new Date("2024-11-03T19:30:00Z"),
    },
    {
      title: "Session 02",
      date: new Date("2024-11-03T19:30:00Z"),
    },
    {
      title: "Session 03",
      date: new Date("2024-11-03T19:30:00Z"),
    },
    {
      title: "Session 04",
      date: new Date("2024-11-03T19:30:00Z"),
    },
  ];

  return (
    <Sheet>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent className="overflow-y-scroll" side="right">
        <SheetHeader>
          <SheetTitle className="md:text-xl">My School Report</SheetTitle>
          <SheetDescription>Kamkunji secondary school</SheetDescription>
        </SheetHeader>

        {sessions.map((session, index) => (
          <div key={session.title} className="border-b border-gray-200 p-4">
            <div className="flex items-center text-lg font-semibold">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500 text-white">
                {index + 1}
              </div>
              <span className="ml-4">{session.title}</span>
            </div>
            <p className="mt-2 text-gray-500">
              {format(session.date, "EEEE, MMM dd")} | {format(session.date, "h:mm a")}
            </p>
          </div>
        ))}
      </SheetContent>
    </Sheet>
  );
}
