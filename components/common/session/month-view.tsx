import {
  CalendarDate,
  getWeeksInMonth,
  isSameDay,
  isWeekend,
} from "@internationalized/date";
import { Dispatch, SetStateAction, useEffect, useRef } from "react";
import {
  useCalendarCell,
  useCalendarGrid,
  useDateFormatter,
  useLocale,
} from "react-aria";
import type { CalendarGridProps } from "react-aria-components";
import { CalendarState } from "react-stately";

import { cn } from "#/lib/utils";

import { useGSAP } from "@gsap/react";
import { ImplementerRole } from "@prisma/client";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SessionList } from "./session-list";
import { Session, useSessions } from "./sessions-provider";
import { useTitle } from "./title-provider";

gsap.registerPlugin(useGSAP, ScrollTrigger);

export function MonthView({
  state,
  ...props
}: {
  state: CalendarState;
  weekdayStyle: CalendarGridProps["weekdayStyle"];
  role: ImplementerRole;
  dialogState: {
    setSession: Dispatch<SetStateAction<Session | null>>;
    setFellowAttendanceDialog: Dispatch<SetStateAction<boolean>>;
    setStudentAttendanceDialog: Dispatch<SetStateAction<boolean>>;
    setRatingsDialog: Dispatch<SetStateAction<boolean>>;
    setSessionOccurrenceDialog: Dispatch<SetStateAction<boolean>>;
  };
  supervisorId?: string;
  fellowId?: string;
}) {
  const { locale } = useLocale();
  const { gridProps, headerProps, weekDays } = useCalendarGrid(props, state);
  const weeksInMonth = getWeeksInMonth(state.visibleRange.start, locale);

  const { setTitle } = useTitle();
  const titleFormatter = useDateFormatter({
    month: "long",
    year: "numeric",
  });
  const headerRowRef: any = useRef(null);

  useEffect(() => {
    if (state.value) {
      setTitle(
        `${titleFormatter.format(state.visibleRange.start.toDate(state.timeZone))}`,
      );
    }
  }, [
    setTitle,
    state.timeZone,
    state.value,
    titleFormatter,
    state.visibleRange.start,
    state.visibleRange.end,
  ]);

  useGSAP(
    () => {
      if (headerRowRef !== null) {
        gsap.timeline({
          scrollTrigger: {
            trigger: headerRowRef.current,
            start: () => "top top",
            end: () => "+=100%",
            scrub: true,
            pin: true,
            pinSpacing: false,
            // markers: true,
          },
        });
      }
    },
    { scope: headerRowRef },
  );

  return (
    <div>
      <table
        ref={headerRowRef}
        className="schedule-table z-10 rounded-t-[0.4375rem] bg-white"
      >
        <thead {...headerProps}>
          <tr>
            {weekDays.map((day, index) => (
              <th
                key={index}
                className={cn({
                  "bg-background-secondary": index === 0 || index === 6,
                })}
              >
                {day}
              </th>
            ))}
          </tr>
        </thead>
      </table>
      <table {...gridProps} className="schedule-table rounded-b-[0.4375rem]">
        <tbody>
          {Array.from(new Array(weeksInMonth).keys()).map((weekIndex) => (
            <tr key={weekIndex}>
              {state
                .getDatesInWeek(weekIndex)
                .map((date, i) =>
                  date ? (
                    <MonthCalendarCell
                      key={i}
                      state={state}
                      date={date}
                      weekend={isWeekend(date, "en-US")}
                      role={props.role}
                      dialogState={props.dialogState}
                      fellowId={props.fellowId}
                    />
                  ) : (
                    <td key={i} />
                  ),
                )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function MonthCalendarCell({
  state,
  date,
  weekend,
  role,
  dialogState,
  fellowId,
}: {
  state: CalendarState;
  date: CalendarDate;
  weekend: boolean;
  role: ImplementerRole;
  dialogState: {
    setSession: Dispatch<SetStateAction<Session | null>>;
    setFellowAttendanceDialog: Dispatch<SetStateAction<boolean>>;
    setStudentAttendanceDialog: Dispatch<SetStateAction<boolean>>;
    setRatingsDialog: Dispatch<SetStateAction<boolean>>;
    setSessionOccurrenceDialog: Dispatch<SetStateAction<boolean>>;
  };
  fellowId?: string;
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

  const { sessions } = useSessions({ date });

  return (
    <td
      {...cellProps}
      className={cn({
        "bg-background-secondary": weekend,
      })}
    >
      <div
        {...buttonProps}
        ref={ref}
        className={cn("cell w-full transition ease-in-out", {
          "outline outline-2 outline-shamiri-new-blue": isSameDay(
            date,
            state.focusedDate,
          ),
          selected: isSelected,
          disabled: isDisabled,
          unavailable: isUnavailable,
        })}
        onClick={() => {
          state.setFocusedDate(date);
        }}
      >
        <div
          className={cn(
            "flex flex-col gap-[8px] overflow-y-auto",
            "px-[10px] py-[4px] xl:px-[16px] xl:py-[8px]",
            "h-[120px] xl:h-[144px]",
          )}
        >
          <div
            className={cn("flex", {
              "text-grey-c3": isOutsideVisibleRange,
            })}
          >
            <div
              className={cn(
                "flex h-6 w-6 items-center justify-center rounded-full p-0.5",
                {
                  "bg-shamiri-new-blue text-white": isSameDay(
                    date,
                    state.focusedDate,
                  ),
                },
              )}
            >
              {formattedDate}
            </div>
          </div>
          <SessionList
            sessions={sessions}
            role={role}
            dialogState={dialogState}
            fellowId={fellowId}
          />
        </div>
      </div>
    </td>
  );
}
