import { SessionStatus } from "@prisma/client";
import { addHours, format } from "date-fns";
import { useEffect, useState } from "react";

import { Icons } from "#/components/icons";
import { cn, sessionDisplayName } from "#/lib/utils";

import FellowAttendance from "#/app/(platform)/hc/schedule/_components/fellow-attendance";
import SupervisorAttendance from "#/app/(platform)/hc/schedule/_components/supervisor-attendance";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import { useSearchParams } from "next/navigation";
import * as React from "react";
import type { Session } from "./sessions-provider";

export function SessionList({ sessions }: { sessions: Session[] }) {
  if (sessions.length === 0) {
    return null;
  }
  if (sessions.length === 1) {
    const [session] = sessions;
    return session && <SessionDetail session={session} layout="expanded" />;
  }

  const restCount = sessions.length - 2;
  return (
    <div className="flex flex-col gap-2">
      <SessionDetail session={sessions[0]!} layout="compact" />
      <SessionDetail session={sessions[1]!} layout="compact" />
      {restCount > 0 && (
        <div className="text-sm font-semibold text-grey-c3">
          + {restCount} more
        </div>
      )}
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
  const [supervisorAttendanceDialog, setSupervisorAttendanceDialog] =
    React.useState(false);
  const [fellowAttendanceDialog, setFellowAttendanceDialog] =
    React.useState(false);

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
  const completed = session.sessionDate < new Date();
  const cancelled = session.status === SessionStatus.Cancelled;

  const isCompact = layout === "compact";
  const isExpanded = layout === "expanded";

  const renderSessionDetails = () => {
    return (
      <div
        className={cn(
          "select-none rounded-[0.25rem] border",
          {
            "px-2 py-1": withDropdown,
            "px-4 py-2": !withDropdown,
          },
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
              <Icons.checkCircle className="h-3 w-3" strokeWidth={2.5} />
            )}
            {!completed && !cancelled && (
              <Icons.helpCircle className="h-3 w-3" strokeWidth={2.5} />
            )}
            {cancelled && <Icons.crossCircleFilled className="h-4 w-4" />}
            {isExpanded && <div>{sessionDisplayName(session.sessionType)}</div>}
            {isCompact && (
              <div className="flex gap-1 truncate">
                {sessionDisplayName(session.sessionType)} -{" "}
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
            </div>
          )}
        </div>
      </div>
    );
  };

  return withDropdown ? (
    <div>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger className="w-full">
          {renderSessionDetails()}
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuLabel>
            <span className="text-xs font-medium uppercase text-shamiri-text-grey">
              Actions
            </span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <div className="popover-links flex flex-col">
            {completed && !cancelled ? (
              <DropdownMenuItem
                onClick={() => {
                  // setSupervisorAttendanceDialog(true);
                }}
              >
                View supervisor attendance
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                className="w-full"
                onClick={() => {
                  setSupervisorAttendanceDialog(true);
                }}
              >
                Mark supervisor attendance
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              onClick={() => {
                setFellowAttendanceDialog(true);
              }}
            >
              View fellow attendance
            </DropdownMenuItem>
            <DropdownMenuItem>Weekly session report</DropdownMenuItem>
            <DropdownMenuItem className="text-shamiri-light-red">
              Archive
            </DropdownMenuItem>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
      <SupervisorAttendance
        isOpen={supervisorAttendanceDialog}
        onChange={setSupervisorAttendanceDialog}
        session={session}
      />
      <FellowAttendance
        isOpen={fellowAttendanceDialog}
        onChange={setFellowAttendanceDialog}
        session={session}
      />
    </div>
  ) : (
    renderSessionDetails()
  );
}
