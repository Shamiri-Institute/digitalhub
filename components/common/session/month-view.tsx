import { type CalendarDate, getWeeksInMonth, isSameDay, isWeekend } from "@internationalized/date";
import type { ImplementerRole } from "@prisma/client";
import { type Dispatch, type SetStateAction, useEffect, useRef } from "react";
import { useCalendarCell, useCalendarGrid, useDateFormatter, useLocale } from "react-aria";
import type { CalendarGridProps } from "react-aria-components";
import type { CalendarState } from "react-stately";
import { cn } from "#/lib/utils";
import { SessionList } from "./session-list";
import { type Session, useSessions } from "./sessions-provider";
import { syncScrollLeft } from "./sync-scroll";
import { useTitle } from "./title-provider";

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
  const headerScrollRef = useRef<HTMLDivElement>(null);
  const bodyScrollRef = useRef<HTMLDivElement>(null);

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

  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[0.4375rem] shadow-inner-2 lg:hidden" />
      <div className="w-full rounded-t-[0.4375rem] border">
        <div
          ref={headerScrollRef}
          onScroll={(e) => syncScrollLeft(e.currentTarget, bodyScrollRef.current)}
          className="no-scrollbar overflow-x-scroll rounded-t-[0.4375rem] md:sticky md:top-0 md:z-20"
        >
          <table className="schedule-table rounded-t-[0.4375rem] bg-white">
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
        </div>
        <div
          ref={bodyScrollRef}
          onScroll={(e) => syncScrollLeft(e.currentTarget, headerScrollRef.current)}
          className="no-scrollbar overflow-x-scroll"
        >
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
