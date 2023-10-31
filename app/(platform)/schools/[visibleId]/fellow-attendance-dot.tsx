"use client";

import * as React from "react";

import { markFellowAttendance } from "#/app/actions";
import { useToast } from "#/components/ui/use-toast";
import { cn } from "#/lib/utils";
import type { AttendanceStatus, SessionLabel } from "#/types/app";
import type {
  FellowWithAttendance,
  SchoolFindUniqueOutput,
} from "#/types/prisma";

export function FellowAttendanceDot({
  session,
  fellow,
  school,
}: {
  session: { status: AttendanceStatus; label: SessionLabel };
  fellow: FellowWithAttendance;
  school: SchoolFindUniqueOutput;
}) {
  const { toast } = useToast();
  const [status, setStatus] = React.useState(session.status);

  const dotColor = React.useCallback((status: AttendanceStatus) => {
    return {
      "bg-[#85A070]": status === "present",
      "bg-[#DE5E68]": status === "absent",
      "bg-zinc-300": status === "not-marked",
    };
  }, []);

  const onDotClick = React.useCallback(async () => {
    const nextStatus = nextAttendanceStatus(status);

    const response = await markFellowAttendance(
      nextStatus,
      session.label,
      fellow.visibleId,
      school.visibleId,
    );
    if (response?.error) {
      toast({
        variant: "destructive",
        title: response?.error,
      });
      return;
    }

    if (response) {
      toast({
        description: (
          <div className="flex gap-1">
            <span
              className={cn(
                "mx-1 h-5 w-5 rounded-full transition-all active:scale-90",
                dotColor(nextStatus),
              )}
            ></span>
            <span>
              {nextStatus === "not-marked" ? (
                <span>
                  <span className="font-bold">Unmarked</span> {session.label}{" "}
                  for {fellow.fellowName}
                </span>
              ) : (
                <span>
                  Marked {session.label} as{" "}
                  <span className="font-bold">{nextStatus}</span> for{" "}
                  {fellow.fellowName}
                </span>
              )}
            </span>
          </div>
        ),
      });

      setStatus(nextStatus);
    } else {
      toast({
        variant: "destructive",
        title: "Something went wrong",
      });
    }
  }, [status]);

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="text-sm text-muted-foreground">{session.label}</div>
      <button
        onClick={onDotClick}
        className={cn(
          "mx-1 h-5 w-5 rounded-full transition-all active:scale-90",
          dotColor(status),
        )}
      ></button>
    </div>
  );
}

function nextAttendanceStatus(status: AttendanceStatus): AttendanceStatus {
  switch (status) {
    case "present":
      return "absent";
    case "absent":
      return "not-marked";
    case "not-marked":
      return "present";
  }
}
