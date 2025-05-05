import { Prisma } from "@prisma/client";
import React from "react";

import { Button } from "#/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "#/components/ui/dialog";
import { format } from "date-fns";

interface AttendanceConfirmationDialogProps {
  fellow: Prisma.FellowGetPayload<{}>;
  attendanceInfo: {
    sessionStatus: string;
    sessionLabel: string;
    sessionDate: Date | null;
    schoolName: string;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: () => void;
  children: React.ReactNode;
}

export const AttendanceConfirmationDialog: React.FC<
  AttendanceConfirmationDialogProps
> = ({ fellow, attendanceInfo, open, onOpenChange, onSubmit, children }) => {
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="overflow-hidden rounded-lg bg-white shadow-md">
        <form onSubmit={handleFormSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">
              Submit delayed payment for {fellow.fellowName}
            </DialogTitle>
          </DialogHeader>
          <DialogDescription className="rounded-md bg-red-50/50 p-4 py-2 font-medium text-red-800">
            Because this attendance is past the payout window, a delayed payment
            must be sent to {fellow.fellowName?.trim()}. Please confirm the
            payment details below.
          </DialogDescription>
          <DialogDescription className="text-base text-gray-700">
            {attendanceInfo.sessionLabel} —{" "}
            {attendanceInfo.sessionDate
              ? format(attendanceInfo.sessionDate, "dd/MM/yyyy")
              : "Unscheduled"}
          </DialogDescription>
          <DialogDescription className="text-base text-gray-700">
            {attendanceInfo.schoolName}
          </DialogDescription>
          <Button
            type="submit"
            size="lg"
            className="block w-full rounded bg-blue-500 text-lg font-bold text-white hover:bg-blue-700"
            data-testid="submit-delayed-payment-button"
          >
            Submit Delayed Payment
          </Button>
          <Button
            type="button"
            size="lg"
            onClick={() => onOpenChange(false)}
            className="block w-full rounded border border-gray-400 bg-white text-lg font-medium text-gray-800 shadow hover:bg-gray-100"
          >
            Cancel Attendance
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
