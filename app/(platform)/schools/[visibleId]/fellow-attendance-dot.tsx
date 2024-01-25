"use client";

import { Prisma } from "@prisma/client";
import { addDays, isBefore, setHours, setMinutes, startOfWeek } from "date-fns";
import * as React from "react";

import { AttendanceConfirmationDialog } from "#/app/(platform)/schools/[visibleId]/attendance-confirmation-dialog";
import { markFellowAttendance } from "#/app/actions";
import { useToast } from "#/components/ui/use-toast";
import { cn } from "#/lib/utils";
import type { AttendanceStatus, SessionLabel } from "#/types/app";
import type { FellowWithAttendance } from "#/types/prisma";

export function FellowAttendanceDot({
  sessionItem,
  fellow,
  school,
  recordTime,
}: {
  sessionItem: {
    status: AttendanceStatus;
    label: SessionLabel;
    session: Prisma.InterventionSessionGetPayload<{}> | null;
  };
  fellow: FellowWithAttendance;
  school: Prisma.SchoolGetPayload<{}>;
  recordTime: Date;
}) {
  const { toast } = useToast();
  const [status, setStatus] = React.useState(sessionItem.status);

  const dotColor = React.useCallback((status: AttendanceStatus) => {
    return {
      "bg-[#85A070]": status === "present",
      "bg-[#DE5E68]": status === "absent",
      "bg-zinc-300": status === "not-marked",
    };
  }, []);

  const markAttendance = React.useCallback(
    async (
      nextStatus: AttendanceStatus,
      sessionLabel: SessionLabel,
      fellowVisibleId: string,
      schoolVisibleId: string,
    ): Promise<void> => {
      const response = await markFellowAttendance(
        nextStatus,
        sessionLabel,
        fellowVisibleId,
        schoolVisibleId,
      );
      if (response?.error) {
        toast({
          variant: "destructive",
          title: response?.error,
        });
        return;
      } else if (response) {
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
                    <span className="font-bold">Unmarked</span>{" "}
                    {sessionItem.label} for {fellow.fellowName}
                  </span>
                ) : (
                  <span>
                    Marked {sessionItem.label} as{" "}
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
    },
    [toast, dotColor, sessionItem.label, fellow.fellowName],
  );

  const [dialogOpen, setDialogOpen] = React.useState(false);

  const onDialogSubmit = async () => {
    const nextStatus = nextAttendanceStatus(status);

    await markAttendance(
      nextStatus,
      sessionItem.label,
      fellow.visibleId,
      school.visibleId,
    );

    setDialogOpen(false);
  };

  function getNextCutoffDate(sessionDate: Date): Date {
    const monday = 1;
    const thursday = 4;
    const cutoffHour = 9;

    // Start of the current week (Monday)
    let thisMonday = startOfWeek(sessionDate, { weekStartsOn: monday });
    thisMonday = setHours(thisMonday, cutoffHour);
    thisMonday = setMinutes(thisMonday, 0);

    // Calculate this week's Thursday
    let thisThursday = addDays(thisMonday, thursday - monday);
    thisThursday = setHours(thisThursday, cutoffHour);
    thisThursday = setMinutes(thisThursday, 0);

    // If the session date is after this week's Thursday, calculate next week's Monday
    if (sessionDate > thisThursday) {
      let nextMonday = addDays(thisMonday, 7);
      return nextMonday;
    }

    // If the session date is after this week's Monday but before or equal to this week's Thursday, return this week's Thursday
    if (sessionDate > thisMonday && sessionDate <= thisThursday) {
      return thisThursday;
    }

    // Otherwise, return this week's Monday
    return thisMonday;
  }

  const isBeforePayoutCutoff = React.useCallback(() => {
    if (!sessionItem.session?.sessionDate) {
      return false;
    }

    const { sessionDate } = sessionItem.session;

    const cutoffDate = getNextCutoffDate(sessionDate);

    return isBefore(recordTime, cutoffDate);
  }, [sessionItem.session, recordTime]);

  const onDotClick = React.useCallback(async () => {
    const nextStatus = nextAttendanceStatus(status);

    if (nextStatus === "present" && !isBeforePayoutCutoff()) {
      setDialogOpen(true);
    } else {
      await markAttendance(
        nextStatus,
        sessionItem.label,
        fellow.visibleId,
        school.visibleId,
      );
    }
  }, [
    isBeforePayoutCutoff,
    fellow.visibleId,
    markAttendance,
    school.visibleId,
    sessionItem.label,
    status,
  ]);

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="text-sm text-muted-foreground">{sessionItem.label}</div>
      <AttendanceConfirmationDialog
        fellow={fellow}
        attendanceInfo={{
          sessionStatus: nextAttendanceStatus(status),
          sessionLabel: sessionItem.label,
          sessionDate: sessionItem.session?.sessionDate ?? null,
          schoolName: school.schoolName,
        }}
        open={dialogOpen}
        onOpenChange={(open: boolean) => {
          if (open && !dialogOpen) {
            return;
          } else {
            setDialogOpen(open);
          }
        }}
        onSubmit={onDialogSubmit}
      >
        <button
          onClick={onDotClick}
          className={cn(
            "mx-1 h-5 w-5 rounded-full transition-all active:scale-95",
            dotColor(status),
          )}
          data-testid="attendance-dot"
        >
          <span className="hidden">{status}</span>
        </button>
      </AttendanceConfirmationDialog>
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
