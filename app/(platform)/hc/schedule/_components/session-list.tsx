import { SessionStatus } from "@prisma/client";
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
import Element = React.JSX.Element;

export function SessionList({ sessions }: { sessions: Session[] }) {
  if (sessions.length === 0) {
    return null;
  }
  if (sessions.length === 1) {
    const [session] = sessions;
    return session && <SessionDetail session={session} layout="expanded" />;
  }

  const moreSessions = sessions.slice(2);
  return (
    <div className="flex flex-col gap-2">
      <SessionDetail session={sessions[0]!} layout="compact" />
      <SessionDetail session={sessions[1]!} layout="compact" />
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
                      session={moreSessions[index]!}
                      layout="compact"
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
  session,
  layout,
  withDropdown = true,
}: {
  session: Session;
  layout: "compact" | "expanded";
  withDropdown?: boolean;
}) {
  const [timeLabels, setTimeLabels] = useState({
    startTimeLabel: "",
    durationLabel: "",
  });
  const [open, setOpen] = React.useState(false);

  const searchParams = useSearchParams();
  const mode = searchParams.get("mode") ?? undefined;

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
  }, [session.sessionDate, session.sessionEndTime]);

  const schoolName = session.school.schoolName;
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
              <div>{sessionDisplayName(session.sessionType!)}</div>
            )}
            {isCompact && (
              <div className="flex gap-1 truncate">
                {sessionDisplayName(session.sessionType!)} -{" "}
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
      <SessionDropDown open={open} setOpen={setOpen} session={session}>
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
  session,
}: {
  open?: boolean;
  setOpen?: Dispatch<SetStateAction<boolean>>;
  children: React.ReactNode;
  session: Session;
}) {
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
            fellowAttendanceContext.setIsOpen(true);
          }}
          disabled={session.status === "Cancelled"}
        >
          View fellow attendance
        </DropdownMenuItem>
        {session.sessionDate > new Date() && (
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              rescheduleSessionContext.setIsOpen(true);
            }}
          >
            Reschedule session
          </DropdownMenuItem>
        )}
        <DropdownMenuItem disabled={session.status === "Cancelled"}>
          Weekly session report
        </DropdownMenuItem>
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
