"use client";

import DataTable from "#/app/(platform)/hc/components/data-table";
import { FellowInfoContext } from "#/app/(platform)/hc/schools/[visibleId]/fellows/context/fellow-info-context";
import DialogAlertWidget from "#/app/(platform)/hc/schools/components/dialog-alert-widget";
import { Icons } from "#/components/icons";
import { Button } from "#/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
} from "#/components/ui/dialog";
import { Prisma } from "@prisma/client";
import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { useContext } from "react";
import FellowAttendanceGetPayload = Prisma.FellowAttendanceGetPayload;

export default function AttendanceHistory({
  attendances,
}: {
  attendances: FellowAttendanceGetPayload<{
    include: {
      session: true;
      group: true;
    };
  }>[];
}) {
  const context = useContext(FellowInfoContext);

  return (
    <Dialog
      open={context.attendanceHistoryDialog}
      onOpenChange={context.setAttendanceHistoryDialog}
    >
      <DialogContent className="w-3/4 max-w-none">
        <DialogHeader>
          <h2 className="text-xl font-bold">Session attendance history</h2>
        </DialogHeader>
        <DialogAlertWidget>
          <div className="flex items-center gap-2">
            <span>{context.fellow?.fellowName}</span>
          </div>
        </DialogAlertWidget>
        <div>
          <DataTable
            columns={columns}
            editColumns={false}
            data={attendances.filter(
              (attendance) => attendance.fellowId === context.fellow?.id,
            )}
            emptyStateMessage={"No sessions found"}
            className="data-table"
          />
        </div>
        <DialogFooter className="flex justify-end gap-2">
          <Button
            variant="ghost"
            type="button"
            className="text-base font-semibold leading-6 text-shamiri-new-blue hover:text-shamiri-new-blue"
            onClick={() => {
              context.setGroupDialog(false);
            }}
          >
            Cancel
          </Button>
          <Button
            variant="brand"
            onClick={() => {
              context.setAddStudentDialog(true);
            }}
            className="flex items-center gap-2"
          >
            <Icons.plusCircle className="h-4 w-4" />
            Add Student
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const columns: ColumnDef<
  FellowAttendanceGetPayload<{
    include: {
      session: true;
      group: true;
    };
  }>
>[] = [
  {
    id: "Date of attendance",
    header: "Date of attendance",
    accessorFn: (row) => {
      return row.session && format(row.session.sessionDate, "dd MMM yyyy");
    },
  },
  // TODO: Replace with session number after session_types table is added
  {
    header: "Session",
    id: "Session",
    accessorFn: (row) => {
      return row.session && row.session.sessionName;
    },
  },
  {
    header: "Group",
    id: "Group",
    accessorKey: "group.groupName",
  },
  // TODO: populate after adding relation with payouts
  {
    header: "Status",
    id: "status",
    accessorFn: (row) => {
      return "";
    },
  },
];
