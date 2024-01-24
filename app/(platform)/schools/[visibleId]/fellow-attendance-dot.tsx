"use client";

import { Prisma } from "@prisma/client";
import {
  endOfWeek,
  isAfter,
  isBefore,
  setDay,
  setHours,
  setMinutes,
  startOfWeek,
} from "date-fns";
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
}: {
  sessionItem: {
    status: AttendanceStatus;
    label: SessionLabel;
    session: Prisma.InterventionSessionGetPayload<{}> | null;
  };
  fellow: FellowWithAttendance;
  school: Prisma.SchoolGetPayload<{}>;
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
    console.debug("onDialogSubmit");

    const nextStatus = nextAttendanceStatus(status);

    await markAttendance(
      nextStatus,
      sessionItem.label,
      fellow.visibleId,
      school.visibleId,
    );

    setDialogOpen(false);
  };

  const attendanceDateBeyondCutoff = React.useCallback(() => {
    if (!sessionItem.session?.occurringAt) {
      return false;
    }

    const now = new Date();
    const sessionDate = new Date(sessionItem.session.occurringAt);

    // Define the start and end of the attendance marking periods
    const startOfCurrentWeek = startOfWeek(now);
    const endOfCurrentWeek = endOfWeek(now);

    const mondayCutoff = setDay(startOfCurrentWeek, 1, { weekStartsOn: 1 });
    const thursdayCutoff = setDay(startOfCurrentWeek, 4, { weekStartsOn: 1 });

    // Set the cutoff time to 9:00 am
    setHours(mondayCutoff, 9);
    setMinutes(mondayCutoff, 0);
    setHours(thursdayCutoff, 9);
    setMinutes(thursdayCutoff, 0);

    // Check if the session date is within the allowed periods for marking attendance
    const isWithinMondayPeriod =
      isAfter(sessionDate, endOfCurrentWeek) && isBefore(now, mondayCutoff);
    const isWithinThursdayPeriod =
      isAfter(sessionDate, startOfCurrentWeek) && isBefore(now, thursdayCutoff);

    return isWithinMondayPeriod || isWithinThursdayPeriod;
  }, [sessionItem.session?.occurringAt]);

  const onDotClick = React.useCallback(async () => {
    const nextStatus = nextAttendanceStatus(status);

    if (nextStatus === "present" && attendanceDateBeyondCutoff()) {
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
          sessionDate: sessionItem.session?.occurringAt ?? null,
          schoolName: school.schoolName,
        }}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={onDialogSubmit}
      >
        <button
          onClick={onDotClick}
          className={cn(
            "mx-1 h-5 w-5 rounded-full transition-all active:scale-95",
            dotColor(status),
          )}
        />
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
