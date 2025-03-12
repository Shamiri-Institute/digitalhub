"use client";

import { FiltersContext } from "#/app/(platform)/hc/schedule/context/filters-context";
import { SessionDropDown } from "#/components/common/session/session-list";
import {
  Session,
  SessionsContext,
} from "#/components/common/session/sessions-provider";
import { useTitle } from "#/components/common/session/title-provider";
import { Icons } from "#/components/icons";
import { Checkbox } from "#/components/ui/checkbox";
import { cn, sessionDisplayName } from "#/lib/utils";
import { ImplementerRole, Prisma, SessionStatus } from "@prisma/client";
import { addDays, addHours, format, isAfter, isBefore } from "date-fns";
import {
  Dispatch,
  SetStateAction,
  useContext,
  useEffect,
  useState,
} from "react";
import { useDateFormatter } from "react-aria";
import { CalendarState } from "react-stately";

export function ListView({
  state,
  hubId,
  role,
  dialogState,
  supervisorId,
  fellowId,
}: {
  state: CalendarState;
  hubId: string;
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
  const { sessions } = useContext(SessionsContext);
  const [sessionGroups, setSessionGroups] = useState<string[]>([]);

  const today = format(new Date(), "yyyy-MM-dd");

  const { setTitle } = useTitle();

  const startDate = state.visibleRange.start;
  const dateFormatter = useDateFormatter({
    dateStyle: "long",
    calendar: startDate.calendar.identifier,
  });

  const { filters } = useContext(FiltersContext);

  useEffect(() => {
    setTitle(
      dateFormatter.formatRange(
        state.visibleRange.start.toDate(state.timeZone),
        state.visibleRange.end.toDate(state.timeZone),
      ),
    );
  }, [
    state.visibleRange.start,
    state.visibleRange.end,
    dateFormatter,
    setTitle,
    state.timeZone,
  ]);

  useEffect(() => {
    const fetchSessions = async () => {
      const start = state.visibleRange.start.toDate(state.timeZone);
      const end = addDays(state.visibleRange.end.toDate(state.timeZone), 1);

      const _sessions = sessions.filter((session) => {
        return session.sessionDate > start && session.sessionDate < end;
      });

      const groupedSessions: {
        [key: string]: Prisma.InterventionSessionGetPayload<{
          include: {
            school: true;
          };
        }>[];
      } = {};

      _sessions.forEach((session) => {
        const date = format(session.sessionDate, "yyyy-MM-dd");
        if (!groupedSessions[date]) {
          groupedSessions[date] = [];
        }
      });

      if (
        !groupedSessions[today] &&
        isAfter(new Date(today), start) &&
        isBefore(new Date(today), end)
      ) {
        groupedSessions[today] = [];
      }
      setSessionGroups(Object.keys(groupedSessions).sort());
    };
    fetchSessions();
  }, [
    filters,
    sessions,
    hubId,
    state.timeZone,
    state.visibleRange.end,
    state.visibleRange.start,
    today,
  ]);

  return (
    <div className="relative">
      <div className="shadow-inner-2 pointer-events-none absolute inset-0 z-40 overflow-hidden rounded-[0.4375rem] lg:hidden"></div>
      <div className="no-scrollbar w-full overflow-x-scroll rounded-t-[0.4375rem] border">
        <table
          className={cn(
            "z-10 table-auto bg-white",
            sessionGroups.length != 0
              ? "schedule-table padded rounded-t-[0.4375rem]"
              : null,
          )}
        >
          {sessionGroups.length == 0 ? (
            <tbody>
              <tr>
                <td colSpan={3}>
                  <div className="px-4 py-3 opacity-80">
                    No sessions within this period.
                  </div>
                </td>
              </tr>
            </tbody>
          ) : null}
          {sessionGroups.map((groupDate) => {
            return (
              <tbody key={groupDate}>
                <tr className="bg-background-secondary">
                  <td
                    className={cn(
                      "!h-auto",
                      groupDate === today
                        ? "border-b !border-b-shamiri-new-blue"
                        : "",
                    )}
                    colSpan={3}
                  >
                    <div
                      className={cn(
                        "flex items-center gap-2 text-lg",
                        groupDate === today ? "text-shamiri-new-blue" : "",
                      )}
                    >
                      <div
                        className={cn(
                          "flex h-8 w-8 items-center justify-center rounded-full p-2",
                          groupDate === today
                            ? "bg-shamiri-new-blue text-white"
                            : "bg-transparent",
                        )}
                      >
                        <span>{format(new Date(groupDate), "dd")}</span>
                      </div>
                      <span
                        className={cn(groupDate !== today ? "opacity-50" : "")}
                      >
                        {format(new Date(groupDate), "EEEE")}
                      </span>
                      <span
                        className={cn(groupDate !== today ? "opacity-50" : "")}
                      >
                        {format(new Date(groupDate), "LLLL")}
                      </span>
                    </div>
                  </td>
                </tr>
                {sessions.filter((session) => {
                  return (
                    format(session.sessionDate, "yyyy-MM-dd") === groupDate
                  );
                }).length === 0 ? (
                  <tr>
                    <td colSpan={3} className="action-cell">
                      <span className="opacity-50">No sessions today.</span>
                    </td>
                  </tr>
                ) : null}
                {sessions
                  .filter((session) => {
                    return (
                      format(session.sessionDate, "yyyy-MM-dd") === groupDate
                    );
                  })
                  .map((session) => {
                    const time = `${format(session.sessionDate, "h:mm")} - ${format(
                      session.sessionEndTime ??
                        addHours(session.sessionDate, 1.5),
                      "h:mm a",
                    )}`;
                    const completed = session.occurred;
                    const cancelled =
                      session.status === SessionStatus.Cancelled;

                    return (
                      <tr key={session.id}>
                        <td className="action-cell !h-auto">
                          <div className="flex items-center justify-center">
                            <Checkbox
                              checked={undefined}
                              onCheckedChange={() => {}}
                              aria-label="Select row"
                              className={
                                "h-5 w-5 border-shamiri-light-grey bg-white data-[state=checked]:bg-shamiri-new-blue"
                              }
                            />
                          </div>
                        </td>
                        <td className="!h-auto">
                          <div className="flex items-center gap-5">
                            <span className="whitespace-nowrap opacity-70">
                              {time}
                            </span>
                            <span className="">
                              {sessionDisplayName(session.sessionType!)}
                            </span>
                            <span className="whitespace-nowrap opacity-50">
                              {session.school?.schoolName}
                            </span>
                            <div
                              className={cn(
                                "shrink-0 select-none rounded-[0.25rem] border px-1.5 py-0.5",
                                {
                                  "border-green-border": completed,
                                  "border-blue-border": !completed,
                                  "border-red-border": cancelled,
                                },
                                {
                                  "bg-green-bg": completed,
                                  "bg-blue-bg": !completed,
                                  "bg-red-bg": cancelled,
                                },
                              )}
                            >
                              <div
                                className={cn("text-[0.825rem] font-semibold", {
                                  "text-green-base": completed,
                                  "text-blue-base": !completed,
                                  "text-red-base": cancelled,
                                })}
                              >
                                <div className="flex items-center gap-1">
                                  {completed && !cancelled && (
                                    <div className="flex items-center gap-1">
                                      <Icons.checkCircle
                                        className="h-3.5 w-3.5"
                                        strokeWidth={2.5}
                                      />
                                      <span className="hidden lg:block">
                                        Attended
                                      </span>
                                    </div>
                                  )}
                                  {!completed && !cancelled && (
                                    <div className="flex items-center gap-1">
                                      <Icons.helpCircle
                                        className="h-3.5 w-3.5"
                                        strokeWidth={2.5}
                                      />
                                      <span className="hidden lg:block">
                                        Not marked
                                      </span>
                                    </div>
                                  )}
                                  {cancelled && (
                                    <div className="flex items-center gap-1">
                                      <Icons.crossCircleFilled
                                        className="h-3.5 w-3.5"
                                        strokeWidth={2.5}
                                      />
                                      <span className="hidden lg:block">
                                        Cancelled
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="action-cell relative !h-auto cursor-pointer">
                          <SessionDropDown
                            state={{
                              session,
                              setSession: dialogState.setSession,
                              setFellowAttendanceDialog:
                                dialogState.setFellowAttendanceDialog,
                              setStudentAttendanceDialog:
                                dialogState.setStudentAttendanceDialog,
                              setRatingsDialog: dialogState.setRatingsDialog,
                            }}
                            role={role}
                            fellowId={fellowId}
                          >
                            <div className="absolute inset-0 bg-white">
                              <div className="flex h-full w-full items-center justify-center">
                                <Icons.moreHorizontal className="h-5 w-5" />
                              </div>
                            </div>
                          </SessionDropDown>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            );
          })}
        </table>
      </div>
    </div>
  );
}
