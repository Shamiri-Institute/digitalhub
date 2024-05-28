import { SessionStatus } from "@prisma/client";
import { addHours, format } from "date-fns";
import { useEffect, useState } from "react";

import { Icons } from "#/components/icons";
import { cn, sessionDisplayName } from "#/lib/utils";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "#/components/ui/popover";
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
        <div
          className="text-sm font-semibold text-grey-c3"
          onClick={() => {
            console.log(restCount);
          }}
        >
          + {restCount} more
        </div>
      )}
    </div>
  );
}

function SessionDetail({
  session,
  layout,
}: {
  session: Session;
  layout: "compact" | "expanded";
}) {
  const [timeLabels, setTimeLabels] = useState({
    startTimeLabel: "",
    durationLabel: "",
  });
  const [open, setOpen] = React.useState(false);

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

  return (
    <div className="relative">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger>
          <div
            className={cn(
              "px-2 py-1",
              "rounded-[0.25rem] border",
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
                {isExpanded && (
                  <div>{sessionDisplayName(session.sessionType)}</div>
                )}
                {isCompact && (
                  <div className="truncate">
                    {sessionDisplayName(session.sessionType)} -{" "}
                    {timeLabels.startTimeLabel}
                  </div>
                )}
              </div>
              {isExpanded && (
                <>
                  <div className="truncate">{schoolName}</div>
                  <div className="text-left">
                    {timeLabels.durationLabel}
                    <span className="invisible">t</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </PopoverTrigger>
        <PopoverContent>
          <div className="-mx-1 flex flex-col gap-y-3 divide-y pb-2">
            <span className="text-sm uppercase text-shamiri-text-grey">
              Actions
            </span>
            <div className="popover-links -mb-3 flex flex-col pt-3">
              {completed && !cancelled ? (
                <span>View supervisor attendance</span>
              ) : (
                <span>Mark supervisor attendance</span>
              )}
              <span>View fellow attendance</span>
              <span>Weekly session report</span>
              <span className="text-shamiri-light-red">Archive</span>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
