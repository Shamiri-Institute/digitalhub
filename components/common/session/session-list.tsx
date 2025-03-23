import { ImplementerRole, SessionStatus } from "@prisma/client";
import { addHours, format } from "date-fns";
import {
  Dispatch,
  SetStateAction,
  useContext,
  useEffect,
  useState,
} from "react";

import { Icons } from "#/components/icons";
import { cn, sessionDisplayName } from "#/lib/utils";

import { CancelSessionContext } from "#/app/(platform)/hc/context/cancel-session-dialog-context";
import { RescheduleSessionContext } from "#/app/(platform)/hc/context/reschedule-session-dialog-context";
import { SupervisorAttendanceContext } from "#/app/(platform)/hc/context/supervisor-attendance-dialog-context";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import { useSearchParams } from "next/navigation";
import * as React from "react";
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
      />
      <div className="w-full">
        {moreSessions.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div className="w-full text-sm font-semibold text-grey-c3">
                + {moreSessions.length} more
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuPortal>
              <DropdownMenuContent className="flex min-w-52 flex-col gap-2 p-2">
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
              </DropdownMenuContent>
            </DropdownMenuPortal>
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
  };
  layout: "compact" | "expanded";
  withDropdown?: boolean;
  role: ImplementerRole;
  fellowId?: string;
  supervisorId?: string;
}) {
  const [timeLabels, setTimeLabels] = useState({
    startTimeLabel: "",
    durationLabel: "",
  });

  const searchParams = useSearchParams();
  const mode = searchParams.get("mode") ?? undefined;

  const { session } = state;

  useEffect(() => {
    const startTimeLabel = format(session.sessionDate, "h:mma");
    const durationLabel = `${format(session.sessionDate, "h:mm")} - ${format(
      session.sessionEndTime ?? addHours(session.sessionDate, 1.5),
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
        className={cn(
          "w-full select-none rounded-[0.25rem] border",
          {
            "px-2 py-1": withDropdown,
            "px-4 py-2": !withDropdown,
          },
          {
            "border-green-border": completed,
            "border-blue-border": !completed,
            "border-red-border": cancelled,
            "border-shamiri-text-dark-grey/30": rescheduled,
          },
          {
            "bg-green-bg": completed,
            "bg-blue-bg": !completed,
            "bg-red-bg": cancelled,
            "bg-shamiri-light-grey/60": rescheduled,
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
            "text-shamiri-text-dark-grey": rescheduled,
          })}
        >
          <div className="flex items-center gap-1">
            {completed && !cancelled && (
              <Icons.checkCircle className="h-3.5 w-3.5" strokeWidth={2.5} />
            )}
            {!completed && !cancelled && !rescheduled && (
              <Icons.helpCircle className="h-3.5 w-3.5" strokeWidth={2.5} />
            )}
            {cancelled && <Icons.crossCircleFilled className="h-3.5 w-3.5" />}
            {rescheduled && (
              <Icons.calendarCheck2 className="h-3.5 w-3.5" strokeWidth={2.5} />
            )}
            {isExpanded && (
              <div>{sessionDisplayName(session.session?.sessionName)}</div>
            )}
            {isCompact && (
              <div className="flex gap-1 truncate">
                {sessionDisplayName(session.session?.sessionName)} -{" "}
                {timeLabels.startTimeLabel}
                {(mode === "day" || !withDropdown) && (
                  <div className="truncate">- {schoolName}</div>
                )}
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
                <span className="font-medium text-shamiri-light-red">
                  RESCHEDULED
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  return withDropdown ? (
    <div>
      <SessionDropDown
        state={state}
        role={role}
        fellowId={fellowId}
        supervisorId={supervisorId}
      >
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
    setStudentAttendanceDialog?: Dispatch<SetStateAction<boolean>>;
    setRescheduleSessionDialog?: Dispatch<SetStateAction<boolean>>;
  };
  role: ImplementerRole;
  fellowId?: string;
  supervisorId?: string;
}) {
  const { session } = state;
  const supervisorAttendanceContext = useContext(SupervisorAttendanceContext);
  const cancelSessionContext = useContext(CancelSessionContext);
  const rescheduleSessionContext = useContext(RescheduleSessionContext);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="w-full" asChild>
        {children}
      </DropdownMenuTrigger>
      <DropdownMenuContent align={"end"}>
        <DropdownMenuLabel>
          <span className="text-xs font-medium uppercase text-shamiri-text-grey">
            Actions
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {role === "HUB_COORDINATOR" && (
          <>
            <DropdownMenuItem
              onClick={() => {
                state.setSession && state.setSession(session);
                supervisorAttendanceContext.setIsOpen(true);
              }}
              disabled={session.status === "Cancelled"}
            >
              {session.occurred
                ? "View supervisor attendance"
                : "Mark supervisor attendance"}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                state.setSession && state.setSession(session);
                state.setFellowAttendanceDialog &&
                  state.setFellowAttendanceDialog(true);
              }}
              disabled={session.status === "Cancelled"}
            >
              View fellow attendance
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={
                session.status === "Cancelled" ||
                session.sessionRatings.length === 0
              }
              onClick={() => {
                state.setSession && state.setSession(session);
                state.setRatingsDialog && state.setRatingsDialog(true);
              }}
            >
              Weekly session report
            </DropdownMenuItem>
          </>
        )}
        {role === "SUPERVISOR" && (
          <>
            <DropdownMenuItem
              onClick={() => {
                state.setSession && state.setSession(session);
                state.setSessionOccurrenceDialog &&
                  state.setSessionOccurrenceDialog(true);
              }}
              disabled={
                session.status === "Cancelled" ||
                session.occurred ||
                session.school?.assignedSupervisorId !== supervisorId
              }
            >
              Mark session occurrence
            </DropdownMenuItem>
            {(session.session?.sessionType === "INTERVENTION" ||
              session.session?.sessionType === "CLINICAL" ||
              session.session?.sessionType === "DATA_COLLECTION") && (
              <>
                <DropdownMenuItem
                  onClick={() => {
                    state.setSession && state.setSession(session);
                    state.setStudentAttendanceDialog &&
                      state.setStudentAttendanceDialog(true);
                  }}
                  disabled={
                    session.status === "Cancelled" ||
                    session.session?.sessionType === "DATA_COLLECTION" ||
                    !session.occurred
                  }
                >
                  Mark student attendance
                </DropdownMenuItem>
                {session.session?.sessionType === "INTERVENTION" && (
                  <DropdownMenuItem
                    disabled={session.status === "Cancelled"}
                    onClick={() => {
                      state.setSession && state.setSession(session);
                      state.setRatingsDialog && state.setRatingsDialog(true);
                    }}
                  >
                    Weekly session report
                  </DropdownMenuItem>
                )}
              </>
            )}
            <DropdownMenuItem
              onClick={() => {
                state.setSession && state.setSession(session);
                state.setFellowAttendanceDialog &&
                  state.setFellowAttendanceDialog(true);
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
        )}
        {role === "HUB_COORDINATOR" || role === "SUPERVISOR" ? (
          <>
            {session.sessionDate > new Date() && (
              <DropdownMenuItem
                onClick={() => {
                  state.setSession && state.setSession(session);
                  state.setRescheduleSessionDialog &&
                    state.setRescheduleSessionDialog(true);
                }}
                disabled={session.occurred}
              >
                Reschedule session
              </DropdownMenuItem>
            )}
            {session.sessionDate > new Date() && (
              <DropdownMenuItem
                className="text-shamiri-light-red"
                onClick={() => {
                  state.setSession && state.setSession(session);
                  cancelSessionContext.setIsOpen(true);
                }}
                disabled={session.status === "Cancelled" || session.occurred}
              >
                Cancel session
              </DropdownMenuItem>
            )}
          </>
        ) : null}
        {role === "FELLOW" ? (
          <>
            <DropdownMenuItem
              onClick={() => {
                state.setSession && state.setSession(session);
                state.setStudentAttendanceDialog &&
                  state.setStudentAttendanceDialog(true);
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
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
