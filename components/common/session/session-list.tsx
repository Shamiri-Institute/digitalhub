import { ImplementerRole, SessionStatus } from "@prisma/client";
import { addHours, addMinutes, format } from "date-fns";
import type * as React from "react";
import { type Dispatch, type SetStateAction, useEffect, useState } from "react";
import { Icons } from "#/components/icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import { cn, sessionDisplayName } from "#/lib/utils";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { Session } from "./sessions-provider";

export function SessionList({
  sessions,
  role,
  dialogState,
  supervisorId,
  fellowId,
}: {
  sessions: Session[];
  role: ImplementerRole;
  dialogState: {
    setSession: Dispatch<SetStateAction<Session | null>>;
    setFellowAttendanceDialog: Dispatch<SetStateAction<boolean>>;
    setStudentAttendanceDialog: Dispatch<SetStateAction<boolean>>;
    setRatingsDialog: Dispatch<SetStateAction<boolean>>;
    setSessionOccurrenceDialog: Dispatch<SetStateAction<boolean>>;
    setRescheduleSessionDialog: Dispatch<SetStateAction<boolean>>;
    setCancelSessionDialog: Dispatch<SetStateAction<boolean>>;
  };
  supervisorId?: string;
  fellowId?: string;
}) {
  if (sessions.length === 0) {
    return null;
  }

  if (sessions.length === 1) {
    const [session] = sessions;
    return (
      session && (
        <SessionDetail
          state={{
            session,
            ...dialogState,
          }}
          role={role}
          layout="expanded"
          fellowId={fellowId}
          supervisorId={supervisorId}
        />
      )
    );
  }

  const moreSessions = sessions.slice(2);
  return (
    <div className="flex flex-col gap-2">
      <SessionDetail
        layout="compact"
        state={{
          session: sessions[0]!,
          ...dialogState,
        }}
        role={role}
        fellowId={fellowId}
        supervisorId={supervisorId}
        onHover={true}
      />
      <SessionDetail
        layout="compact"
        state={{
          session: sessions[1]!,
          ...dialogState,
        }}
        role={role}
        fellowId={fellowId}
        supervisorId={supervisorId}
        onHover={true}
      />
      <div className="w-full overflow-visible">
        {moreSessions.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div className="w-full text-sm font-semibold text-grey-c3">
                + {moreSessions.length} more
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="max-h-[250px] min-w-72 overflow-auto p-2" align="start">
              <div className="flex flex-col gap-2">
                {moreSessions.map((session, index) => {
                  return (
                    <SessionDetail
                      key={session.id}
                      layout="compact"
                      state={{
                        session: moreSessions[index]!,
                        ...dialogState,
                      }}
                      role={role}
                      fellowId={fellowId}
                      supervisorId={supervisorId}
                    />
                  );
                })}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}

export function SessionDetail({
  state,
  layout,
  withDropdown = true,
  onHover = false,
  role,
  fellowId,
  supervisorId,
}: {
  state: {
    session: Session;
    setSession?: Dispatch<SetStateAction<Session | null>>;
    setRatingsDialog?: Dispatch<SetStateAction<boolean>>;
    setSessionOccurrenceDialog?: Dispatch<SetStateAction<boolean>>;
    setFellowAttendanceDialog?: Dispatch<SetStateAction<boolean>>;
    setStudentAttendanceDialog?: Dispatch<SetStateAction<boolean>>;
    setRescheduleSessionDialog?: Dispatch<SetStateAction<boolean>>;
    setCancelSessionDialog?: Dispatch<SetStateAction<boolean>>;
  };
  layout: "compact" | "expanded";
  withDropdown?: boolean;
  onHover?: boolean;
  role: ImplementerRole;
  fellowId?: string;
  supervisorId?: string;
}) {
  const [timeLabels, setTimeLabels] = useState({
    startTimeLabel: "",
    durationLabel: "",
  });

  const { session } = state;

  useEffect(() => {
    const startTimeLabel = format(session.sessionDate, "h:mma");
    const durationLabel = `${format(session.sessionDate, "h:mm")} - ${format(
      session.sessionEndTime ?? addHours(addMinutes(session.sessionDate, 30), 1),
      "h:mma",
    )}`;

    setTimeLabels({
      startTimeLabel,
      durationLabel,
    });
  }, [state.session.sessionDate, state.session.sessionEndTime]);

  const schoolName = session.school?.schoolName ?? session.venue;
  const completed = session.occurred;
  const cancelled = session.status === SessionStatus.Cancelled;
  const rescheduled = session.status === SessionStatus.Rescheduled;

  const isCompact = layout === "compact";
  const isExpanded = layout === "expanded";

  const renderSessionDetails = () => {
    return (
      <div
        className={cn("relative", {
          "h-[30px]": isCompact,
          "h-full": isExpanded,
        })}
      >
        {" "}
        <div
          className={cn(
            "w-full select-none rounded-[0.25rem] border transition-all duration-75 ease-in-out",
            { "absolute left-0 top-0": isCompact },
            {
              "group px-2 py-1 hover:z-50 hover:w-auto hover:drop-shadow-md":
                withDropdown && onHover && isCompact,
              "px-2 py-1": withDropdown && !onHover,
              "px-4 py-2": !withDropdown,
            },
            {
              "border-green-border": completed,
              "border-blue-border": !completed,
              "border-red-border": cancelled,
              "border-shamiri-text-dark-grey/30": rescheduled && !session.occurred,
            },
            {
              "bg-green-bg": completed,
              "bg-blue-bg": !completed,
              "bg-red-bg": cancelled,
              "bg-shamiri-light-grey/60": rescheduled && !session.occurred,
            },
          )}
        >
          <div
            className={cn("font-semibold", {
              "text-[0.825rem]": withDropdown,
              "text-base": !withDropdown,
              "text-green-base": completed,
              "text-blue-base": !completed,
              "text-red-base": cancelled,
              "text-shamiri-text-dark-grey": rescheduled && !session.occurred,
            })}
          >
            <div className="flex items-center gap-1">
              {completed && !cancelled && (
                <Icons.checkCircle className="h-3.5 w-3.5 shrink-0" strokeWidth={2.5} />
              )}
              {!completed && !cancelled && !rescheduled && (
                <Icons.helpCircle className="h-3.5 w-3.5 shrink-0" strokeWidth={2.5} />
              )}
              {cancelled && <Icons.crossCircleFilled className="h-3.5 w-3.5 shrink-0" />}
              {rescheduled && (
                <Icons.calendarCheck2 className="h-3.5 w-3.5 shrink-0" strokeWidth={2.5} />
              )}
              {isExpanded && <div>{sessionDisplayName(session.session?.sessionName)}</div>}
              {isCompact && (
                <div className="flex gap-1 truncate">
                  {sessionDisplayName(session.session?.sessionName)} - {timeLabels.startTimeLabel}
                  <div className="truncate group-hover:text-foreground">- {schoolName}</div>
                </div>
              )}
            </div>
            {isExpanded && (
              <div className="text-left">
                <div className="truncate">{schoolName}</div>
                <div>
                  {timeLabels.durationLabel}
                  <span className="invisible">t</span>
                </div>
                {session.status === "Rescheduled" && (
                  <span className="font-medium text-shamiri-light-red">RESCHEDULED</span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return withDropdown ? (
    <div>
      <SessionDropDown state={state} role={role} fellowId={fellowId} supervisorId={supervisorId}>
        {renderSessionDetails()}
      </SessionDropDown>
    </div>
  ) : (
    renderSessionDetails()
  );
}

export function SessionDropDown({
  children,
  state,
  role,
  fellowId,
  supervisorId,
}: {
  children: React.ReactNode;
  state: {
    session: Session;
    setSession?: Dispatch<SetStateAction<Session | null>>;
    setRatingsDialog?: Dispatch<SetStateAction<boolean>>;
    setSessionOccurrenceDialog?: Dispatch<SetStateAction<boolean>>;
    setFellowAttendanceDialog?: Dispatch<SetStateAction<boolean>>;
    setSupervisorAttendanceDialog?: Dispatch<SetStateAction<boolean>>;
    setStudentAttendanceDialog?: Dispatch<SetStateAction<boolean>>;
    setRescheduleSessionDialog?: Dispatch<SetStateAction<boolean>>;
    setCancelSessionDialog?: Dispatch<SetStateAction<boolean>>;
  };
  role: ImplementerRole;
  fellowId?: string;
  supervisorId?: string;
}) {
  const { session } = state;
  const pathname = usePathname();
  const isSchedulePage = pathname.includes("/schedule");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="w-full" asChild>
        {children}
      </DropdownMenuTrigger>
      <DropdownMenuContent align={"end"}>
        <DropdownMenuLabel>
          <span className="text-xs font-medium uppercase text-shamiri-text-grey">Actions</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {role === ImplementerRole.ADMIN && (
          <>
            {isSchedulePage && (
              <Link href={`/admin/schools/${session.school?.visibleId}/sessions`}>
                <DropdownMenuItem>View school</DropdownMenuItem>
              </Link>
            )}
            <DropdownMenuItem
              onClick={() => {
                state.setSession?.(session);
                state.setSupervisorAttendanceDialog?.(true);
              }}
              disabled={session.status === "Cancelled" || !session.occurred}
            >
              View supervisor attendance
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                state.setSession?.(session);
                state.setFellowAttendanceDialog?.(true);
              }}
              disabled={session.status === "Cancelled" || !session.occurred}
            >
              View fellow attendance
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={
                session.status === "Cancelled" ||
                !session.occurred ||
                session.sessionRatings.length === 0
              }
              onClick={() => {
                state.setSession?.(session);
                state.setRatingsDialog?.(true);
              }}
            >
              Weekly session report
            </DropdownMenuItem>
          </>
        )}
        {role === ImplementerRole.HUB_COORDINATOR && (
          <>
            <DropdownMenuItem
              onClick={() => {
                state.setSession?.(session);
                state.setSupervisorAttendanceDialog?.(true);
              }}
              disabled={session.status === "Cancelled" || !session.occurred}
            >
              Mark supervisor attendance
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                state.setSession?.(session);
                state.setStudentAttendanceDialog?.(true);
              }}
              disabled={
                session.status === "Cancelled" ||
                session.session?.sessionType === "DATA_COLLECTION" ||
                !session.occurred
              }
            >
              Mark student attendance
            </DropdownMenuItem>
          </>
        )}
        {role === ImplementerRole.HUB_COORDINATOR || role === ImplementerRole.SUPERVISOR ? (
          <>
            <DropdownMenuItem
              onClick={() => {
                state.setSession?.(session);
                state.setFellowAttendanceDialog?.(true);
              }}
              disabled={
                session.status === "Cancelled" ||
                session.session?.sessionType === "CLINICAL" ||
                !session.occurred
              }
            >
              Mark fellow attendance
            </DropdownMenuItem>
            {session.session?.sessionType === "INTERVENTION" && (
              <DropdownMenuItem
                disabled={
                  session.status === "Cancelled" ||
                  !session.occurred ||
                  (role === ImplementerRole.HUB_COORDINATOR &&
                    session.sessionRatings.length === 0) ||
                  (role === ImplementerRole.SUPERVISOR &&
                    session.school?.assignedSupervisorId !== supervisorId)
                }
                onClick={() => {
                  state.setSession?.(session);
                  state.setRatingsDialog?.(true);
                }}
              >
                Weekly session report
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              onClick={() => {
                state.setSession?.(session);
                state.setFellowAttendanceDialog?.(true);
              }}
              disabled={
                session.status === "Cancelled" ||
                session.session?.sessionType === "CLINICAL" ||
                !session.occurred
              }
            >
              Mark fellow attendance
            </DropdownMenuItem>
          </>
        ) : null}
        {role === ImplementerRole.HUB_COORDINATOR || role === ImplementerRole.SUPERVISOR ? (
          <>
            <DropdownMenuItem
              onClick={() => {
                state.setSession?.(session);
                state.setSessionOccurrenceDialog?.(true);
              }}
              disabled={
                session.status === "Cancelled" ||
                session.occurred ||
                (session.school?.assignedSupervisorId !== supervisorId &&
                  role !== "HUB_COORDINATOR")
              }
            >
              Mark session occurrence
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                state.setSession?.(session);
                state.setRescheduleSessionDialog?.(true);
              }}
              disabled={
                session.occurred ||
                (role === "SUPERVISOR" && session.school?.assignedSupervisorId !== supervisorId)
              }
            >
              Reschedule session
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-shamiri-light-red"
              onClick={() => {
                state.setSession?.(session);
                state.setCancelSessionDialog?.(true);
              }}
              disabled={
                session.status === "Cancelled" ||
                session.occurred ||
                (role === "SUPERVISOR" && session.school?.assignedSupervisorId !== supervisorId)
              }
            >
              Cancel session
            </DropdownMenuItem>
          </>
        ) : null}
        {role === ImplementerRole.FELLOW ? (
          <DropdownMenuItem
            onClick={() => {
              state.setSession?.(session);
              state.setStudentAttendanceDialog?.(true);
            }}
            disabled={
              session.status === "Cancelled" ||
              session.session?.sessionType === "DATA_COLLECTION" ||
              !session.occurred ||
              !session.school?.interventionGroups.find((group) => {
                return group.leaderId === fellowId;
              })
            }
          >
            Mark student attendance
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
