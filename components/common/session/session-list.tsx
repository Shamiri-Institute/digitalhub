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
import { FellowAttendanceContext } from "#/app/(platform)/hc/context/fellow-attendance-dialog-context";
import { RescheduleSessionContext } from "#/app/(platform)/hc/context/reschedule-session-dialog-context";
import { SupervisorAttendanceContext } from "#/app/(platform)/hc/context/supervisor-attendance-dialog-context";
import DialogAlertWidget from "#/app/(platform)/hc/schools/components/dialog-alert-widget";
import { MarkSessionOccurrence } from "#/app/(platform)/sc/schedule/components/mark-session-occurrence";
import SessionRatings from "#/components/common/session/session-ratings";
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
}: {
  sessions: Session[];
  role: ImplementerRole;
  dialogState: {
    setFellowAttendanceDialog: Dispatch<SetStateAction<boolean>>;
  };
}) {
  const [activeSession, setActiveSession] = useState<Session | undefined>();
  const [ratingsDialog, setRatingsDialog] = useState<boolean>(false);
  const [sessionOccurrenceDialog, setSessionOccurrenceDialog] =
    useState<boolean>(false);

  if (sessions.length === 0) {
    return null;
  }

  const renderSessionDialogs = () => {
    return (
      activeSession && (
        <>
          {activeSession.session?.sessionType === "INTERVENTION" &&
            activeSession.schoolId && (
              <SessionRatings
                schoolId={activeSession.schoolId}
                open={ratingsDialog}
                onOpenChange={setRatingsDialog}
                ratings={activeSession.sessionRatings.map((rating) => {
                  const { sessionRatings, ..._session } = activeSession;
                  return {
                    ...rating,
                    session: _session,
                  };
                })}
                mode="view"
              >
                <DialogAlertWidget label={activeSession.school?.schoolName} />
              </SessionRatings>
            )}
          <MarkSessionOccurrence
            id={activeSession.id}
            defaultOccurrence={activeSession.occurred}
            isOpen={sessionOccurrenceDialog}
            setIsOpen={setSessionOccurrenceDialog}
          >
            {activeSession && (
              <SessionDetail
                state={{ session: activeSession }}
                layout={"compact"}
                withDropdown={false}
                role={role}
              />
            )}
          </MarkSessionOccurrence>
        </>
      )
    );
  };
  if (sessions.length === 1) {
    const [session] = sessions;
    return (
      session && (
        <>
          <SessionDetail
            state={{
              session,
              setSession: setActiveSession,
              setRatingsDialog,
              setSessionOccurrenceDialog,
              setFellowAttendanceDialog: dialogState.setFellowAttendanceDialog,
            }}
            role={role}
            layout="expanded"
          />
          {renderSessionDialogs()}
        </>
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
          setSession: setActiveSession,
          setRatingsDialog,
          setSessionOccurrenceDialog,
          setFellowAttendanceDialog: dialogState.setFellowAttendanceDialog,
        }}
        role={role}
      />
      <SessionDetail
        layout="compact"
        state={{
          session: sessions[1]!,
          setSession: setActiveSession,
          setRatingsDialog,
          setSessionOccurrenceDialog,
          setFellowAttendanceDialog: dialogState.setFellowAttendanceDialog,
        }}
        role={role}
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
                        setSession: setActiveSession,
                        setRatingsDialog,
                        setSessionOccurrenceDialog,
                        setFellowAttendanceDialog:
                          dialogState.setFellowAttendanceDialog,
                      }}
                      role={role}
                    />
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenuPortal>
          </DropdownMenu>
        )}
      </div>
      {renderSessionDialogs()}
    </div>
  );
}

export function SessionDetail({
  state,
  layout,
  withDropdown = true,
  role,
}: {
  state: {
    session: Session;
    setSession?: Dispatch<SetStateAction<Session | undefined>>;
    setRatingsDialog?: Dispatch<SetStateAction<boolean>>;
    setSessionOccurrenceDialog?: Dispatch<SetStateAction<boolean>>;
    setFellowAttendanceDialog?: Dispatch<SetStateAction<boolean>>;
  };
  layout: "compact" | "expanded";
  withDropdown?: boolean;
  role: ImplementerRole;
}) {
  const [timeLabels, setTimeLabels] = useState({
    startTimeLabel: "",
    durationLabel: "",
  });
  const [open, setOpen] = React.useState(false);

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
      <SessionDropDown open={open} setOpen={setOpen} state={state} role={role}>
        {renderSessionDetails()}
      </SessionDropDown>
    </div>
  ) : (
    renderSessionDetails()
  );
}

export function SessionDropDown({
  open,
  setOpen,
  children,
  state,
  role,
}: {
  open?: boolean;
  setOpen?: Dispatch<SetStateAction<boolean>>;
  children: React.ReactNode;
  state: {
    session: Session;
    setSession?: Dispatch<SetStateAction<Session | undefined>>;
    setRatingsDialog?: Dispatch<SetStateAction<boolean>>;
    setSessionOccurrenceDialog?: Dispatch<SetStateAction<boolean>>;
    setFellowAttendanceDialog?: Dispatch<SetStateAction<boolean>>;
  };
  role: ImplementerRole;
}) {
  const { session } = state;
  const supervisorAttendanceContext = useContext(SupervisorAttendanceContext);
  const fellowAttendanceContext = useContext(FellowAttendanceContext);
  const cancelSessionContext = useContext(CancelSessionContext);
  const rescheduleSessionContext = useContext(RescheduleSessionContext);

  return (
    <DropdownMenu
      open={open}
      onOpenChange={(open) => {
        if (setOpen) {
          setOpen(open);
        }
        if (open) {
          supervisorAttendanceContext.setSession(session);
          fellowAttendanceContext.setSession(session);
          cancelSessionContext.setSession(session);
          rescheduleSessionContext.setSession(session);
        }
      }}
    >
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
              onClick={(e) => {
                e.stopPropagation();
                supervisorAttendanceContext.setIsOpen(true);
              }}
              disabled={session.status === "Cancelled"}
            >
              {session.occurred
                ? "View supervisor attendance"
                : "Mark supervisor attendance"}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
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
              onClick={(e) => {
                e.stopPropagation();
                if (state.setSession) {
                  state.setSession(session);
                }
                if (state.setRatingsDialog) {
                  state.setRatingsDialog(true);
                }
              }}
            >
              Weekly session report
            </DropdownMenuItem>
          </>
        )}
        {role === "SUPERVISOR" && (
          <>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                state.setSession && state.setSession(session);
                state.setSessionOccurrenceDialog &&
                  state.setSessionOccurrenceDialog(true);
              }}
              disabled={session.status === "Cancelled" || session.occurred}
            >
              Mark session occurrence
            </DropdownMenuItem>
            {(session.session?.sessionType === "INTERVENTION" ||
              session.session?.sessionType === "CLINICAL" ||
              session.session?.sessionType === "DATA_COLLECTION") && (
              <>
                <DropdownMenuItem
                  disabled={
                    session.status === "Cancelled" ||
                    session.session?.sessionType === "DATA_COLLECTION"
                  }
                >
                  Mark student attendance
                </DropdownMenuItem>
                {session.session?.sessionType === "INTERVENTION" && (
                  <DropdownMenuItem
                    disabled={
                      session.status === "Cancelled" ||
                      session.sessionRatings.length === 0
                    }
                    onClick={(e) => {
                      e.stopPropagation();
                      if (state.setSession) {
                        state.setSession(session);
                      }
                      if (state.setRatingsDialog) {
                        state.setRatingsDialog(true);
                      }
                    }}
                  >
                    Weekly session report
                  </DropdownMenuItem>
                )}
              </>
            )}
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                state.setSession && state.setSession(session);
                state.setFellowAttendanceDialog &&
                  state.setFellowAttendanceDialog(true);
              }}
              disabled={
                session.status === "Cancelled" ||
                session.session?.sessionType === "CLINICAL"
              }
            >
              Mark fellow attendance
            </DropdownMenuItem>
          </>
        )}
        {session.sessionDate > new Date() && (
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              rescheduleSessionContext.setIsOpen(true);
            }}
            disabled={session.occurred}
          >
            Reschedule session
          </DropdownMenuItem>
        )}
        {session.sessionDate > new Date() && (
          <DropdownMenuItem
            className="text-shamiri-light-red"
            onClick={(e) => {
              e.stopPropagation();
              cancelSessionContext.setIsOpen(true);
            }}
            disabled={session.status === "Cancelled"}
          >
            Cancel session
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
