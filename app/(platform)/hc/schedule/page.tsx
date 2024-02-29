"use client";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "#/components/ui/popover";
import { format } from "date-fns";
import {
  Button,
  Calendar,
  CalendarCell,
  CalendarGrid,
  CalendarGridBody,
  CalendarGridHeader,
  CalendarHeaderCell,
  Heading,
} from "react-aria-components";

type ISession = {
  kind: "Pre" | "S1" | "S2" | "S3" | "S4";
  duration: {
    start: string;
    end: string;
  };
  date: string;
  school: string;
  state: "occurred" | "upcoming" | "rescheduled" | "cancelled";
};

const sessions: ISession[] = [
  {
    kind: "Pre",
    duration: {
      start: "6:00AM",
      end: "7:30AM",
    },
    date: "2023-06-05",
    school: "Olympic Secondary School",
    state: "occurred",
  },
];

export default function HCSchedulePage() {
  return (
    <div className="px-[24px] pb-[24px] pt-[20px]">
      <h1>SDH Schedule</h1>
      <section>
        <Calendar aria-label="Session schedule">
          <header className="mb-2">
            <Button slot="previous">◀</Button>
            <Heading />
            <Button slot="next">▶</Button>
          </header>
          <CalendarGrid
            className="border-separate border-spacing-0"
            weekdayStyle="long"
          >
            <CalendarGridHeader>
              {(day) => (
                <CalendarHeaderCell className="border-l border-t border-[#E8E8E8] bg-[#F7F7F7] px-[16px] py-[12px] text-left first:rounded-tl-[7px] last:rounded-tr-[7px] last:border-r">
                  {day}
                </CalendarHeaderCell>
              )}
            </CalendarGridHeader>

            <CalendarGridBody>
              {(date) => (
                <CalendarCell date={date} className="m-0 p-0">
                  <div className="flex h-[144px] w-[198px] flex-col gap-[8px] overflow-y-scroll border-l border-t border-[#E8E8E8] px-[16px] py-[8px]">
                    <div>{format(date.toDate("GMT"), "dd")}</div>
                    {format(date.toDate("GMT"), "d") === "1" && (
                      <ExampleSession />
                    )}
                  </div>
                </CalendarCell>
              )}
            </CalendarGridBody>
          </CalendarGrid>
        </Calendar>
      </section>
    </div>
  );
}

function ExampleSession() {
  return (
    <Popover>
      <PopoverTrigger>session 1</PopoverTrigger>
      <PopoverContent className="w-[360px]">
        <input />
        <button onClick={() => console.log("button clicked")}>Click me</button>
      </PopoverContent>
    </Popover>
  );
}
