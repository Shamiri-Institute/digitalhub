"use client";

import { useTitle } from "#/app/(platform)/hc/schedule/_components/title-provider";
import { FiltersContext } from "#/app/(platform)/hc/schedule/context/filters-context";
import { Icons } from "#/components/icons";
import { Checkbox } from "#/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import { fetchInterventionSessions } from "#/lib/actions/fetch-sessions";
import { cn, sessionDisplayName } from "#/lib/utils";
import { Prisma, SessionStatus } from "@prisma/client";
import { addDays, addHours, format, isAfter, isBefore } from "date-fns";
import { useContext, useEffect, useState } from "react";
import { useDateFormatter } from "react-aria";
import { CalendarState } from "react-stately";

export function ListView({
  state,
  hubId,
}: {
  state: CalendarState;
  hubId: string;
}) {
  const [sessions, setSessions] = useState<
    Prisma.InterventionSessionGetPayload<{
      include: {
        school: true;
      };
    }>[]
  >([]);
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
      const _sessions = await fetchInterventionSessions({
        hubId,
        start,
        end,
        filters,
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

      setSessions(_sessions);
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
  }, [hubId, state.timeZone, state.visibleRange.end, state.visibleRange.start]);

  return (
    <table
      className={cn(
        "z-10 mt-10 table-auto bg-white",
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
                  <span className={cn(groupDate !== today ? "opacity-50" : "")}>
                    {format(new Date(groupDate), "EEEE")}
                  </span>
                  <span className={cn(groupDate !== today ? "opacity-50" : "")}>
                    {format(new Date(groupDate), "LLLL")}
                  </span>
                </div>
              </td>
            </tr>
            {sessions.filter((session) => {
              return format(session.sessionDate, "yyyy-MM-dd") === groupDate;
            }).length === 0 ? (
              <tr>
                <td colSpan={3} className="action-cell">
                  <span className="opacity-50">No sessions today.</span>
                </td>
              </tr>
            ) : null}
            {sessions
              .filter((session) => {
                return format(session.sessionDate, "yyyy-MM-dd") === groupDate;
              })
              .map((session) => {
                const time = `${format(session.sessionDate, "h:mm")} - ${format(
                  session.sessionEndTime ?? addHours(session.sessionDate, 1.5),
                  "h:mm a",
                )}`;
                const completed = session.sessionDate < new Date();
                const cancelled = session.status === SessionStatus.Cancelled;

                return (
                  <tr key={session.id}>
                    <td className="action-cell">
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
                    <td>
                      <div className="flex items-center gap-5">
                        <span className="opacity-70">{time}</span>
                        <span className="">
                          {sessionDisplayName(session.sessionType)}
                        </span>
                        <span className="opacity-50">
                          {session.school.schoolName}
                        </span>
                        <div
                          className={cn(
                            "select-none rounded-[0.25rem] border px-1.5 py-0.5",
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
                                  <span>Attended</span>
                                </div>
                              )}
                              {!completed && !cancelled && (
                                <div className="flex items-center gap-1">
                                  <Icons.helpCircle
                                    className="h-3.5 w-3.5"
                                    strokeWidth={2.5}
                                  />
                                  <span>Not marked</span>
                                </div>
                              )}
                              {cancelled && (
                                <div className="flex items-center gap-1">
                                  <Icons.crossCircleFilled
                                    className="h-3.5 w-3.5"
                                    strokeWidth={2.5}
                                  />
                                  <span>Cancelled</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="action-cell relative cursor-pointer">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <div className="absolute inset-0 bg-white">
                            <div className="flex h-full w-full items-center justify-center">
                              <Icons.moreHorizontal className="h-5 w-5" />
                            </div>
                          </div>
                        </DropdownMenuTrigger>
                        <DropdownMenuPortal>
                          <DropdownMenuContent
                            align="end"
                            onCloseAutoFocus={(e) => {
                              e.preventDefault();
                            }}
                          >
                            <DropdownMenuLabel>
                              <span className="text-xs font-medium uppercase text-shamiri-text-grey">
                                Actions
                              </span>
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem>
                              View supervisor attendance
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenuPortal>
                      </DropdownMenu>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        );
      })}
    </table>
  );
}
