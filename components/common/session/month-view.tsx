import { useGSAP } from "@gsap/react";
import { type CalendarDate, getWeeksInMonth, isSameDay, isWeekend } from "@internationalized/date";
import type { ImplementerRole } from "@prisma/client";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { type Dispatch, type SetStateAction, useEffect, useRef } from "react";
import { useCalendarCell, useCalendarGrid, useDateFormatter, useLocale } from "react-aria";
import type { CalendarGridProps } from "react-aria-components";
import type { CalendarState } from "react-stately";
import { cn } from "#/lib/utils";
import { SessionList } from "./session-list";
import { type Session, useSessions } from "./sessions-provider";
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
    setSupervisorAttendanceDialog: Dispatch<SetStateAction<boolean>>;
    setStudentAttendanceDialog: Dispatch<SetStateAction<boolean>>;
    setRatingsDialog: Dispatch<SetStateAction<boolean>>;
    setSessionOccurrenceDialog: Dispatch<SetStateAction<boolean>>;
    setRescheduleSessionDialog: Dispatch<SetStateAction<boolean>>;
    setCancelSessionDialog: Dispatch<SetStateAction<boolean>>;
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
      setTitle(`${titleFormatter.format(state.visibleRange.start.toDate(state.timeZone))}`);
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
      const mm = gsap.matchMedia();

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
      <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[0.4375rem] shadow-inner-2 lg:hidden" />
      <div className="no-scrollbar w-full overflow-x-scroll rounded-t-[0.4375rem] border">
        <table ref={headerRowRef} className="schedule-table z-20 rounded-t-[0.4375rem] bg-white">
          <thead {...headerProps}>
            <tr>
              {weekDays.map((day, index) => (
                <th
                  key={day}
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
                        key={date.toString()}
                        state={state}
                        date={date}
                        weekend={isWeekend(date, "en-US")}
                        role={props.role}
                        dialogState={props.dialogState}
                        fellowId={props.fellowId}
                        supervisorId={props.supervisorId}
                      />
                    ) : (
                      <td key={i.toString()} />
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

export function MonthCalendarCell({
  state,
  date,
  weekend,
  role,
  dialogState,
  fellowId,
  supervisorId,
}: {
  state: CalendarState;
  date: CalendarDate;
  weekend: boolean;
  role: ImplementerRole;
  dialogState: {
    setSession: Dispatch<SetStateAction<Session | null>>;
    setFellowAttendanceDialog: Dispatch<SetStateAction<boolean>>;
    setSupervisorAttendanceDialog: Dispatch<SetStateAction<boolean>>;
    setStudentAttendanceDialog: Dispatch<SetStateAction<boolean>>;
    setRatingsDialog: Dispatch<SetStateAction<boolean>>;
    setSessionOccurrenceDialog: Dispatch<SetStateAction<boolean>>;
    setRescheduleSessionDialog: Dispatch<SetStateAction<boolean>>;
    setCancelSessionDialog: Dispatch<SetStateAction<boolean>>;
  };
  fellowId?: string;
  supervisorId?: string;
}) {
  const ref = useRef<HTMLButtonElement>(null);
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
      <button
        type="button"
        {...buttonProps}
        ref={ref}
        className={cn("h-full w-full transition ease-in-out", {
          "outline-solid outline-2 outline-shamiri-new-blue": isSameDay(date, state.focusedDate),
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
            "flex flex-col gap-[8px]",
            "px-[10px] py-[4px] xl:px-[16px] xl:py-[8px]",
            "h-full lg:h-[120px] xl:h-[144px]",
          )}
        >
          <div
            className={cn("flex", {
              "text-grey-c3": isOutsideVisibleRange,
            })}
          >
            <div
              className={cn("flex h-6 w-6 items-center justify-center rounded-full p-0.5", {
                "bg-shamiri-new-blue text-white": isSameDay(date, state.focusedDate),
              })}
            >
              {formattedDate}
            </div>
          </div>
          <SessionList
            sessions={sessions}
            role={role}
            dialogState={dialogState}
            fellowId={fellowId}
            supervisorId={supervisorId}
          />
        </div>
      </button>
    </td>
  );
}
