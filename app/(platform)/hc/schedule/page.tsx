"use client";

import { format } from "date-fns";
import {
  Button,
  Calendar,
  CalendarCell,
  CalendarGrid,
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
    <div className="App">
      <h1>SDH Schedule</h1>
      <section>
        <Calendar aria-label="Appointment date">
          <header>
            <Button slot="previous">◀</Button>
            <Heading />
            <Button slot="next">▶</Button>
          </header>
          <CalendarGrid>
            {(date) => (
              <CalendarCell date={date} className="m-0 p-0">
                <div className="flex h-[144px] w-[198px] flex-col gap-[8px] border-t border-[#E8E8E8] px-[16px] py-[8px]">
                  {format(date.toDate("GMT"), "d")}
                </div>
              </CalendarCell>
            )}
          </CalendarGrid>
        </Calendar>
      </section>
    </div>
  );
}
