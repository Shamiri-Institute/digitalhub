"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import type { Dispatch, SetStateAction } from "react";
import type { SchoolStudentTableData } from "#/components/common/student/columns";
import DataTable from "#/components/data-table";
import { Icons } from "#/components/icons";
import { Button } from "#/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "#/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "#/components/ui/dropdown-menu";
import { sortBy } from "#/lib/table-view";
import { cn, sessionDisplayName } from "#/lib/utils";
import { RowActionsTrigger } from "#/components/common/row-actions-menu";

export default function AttendanceHistory({
  open,
  onOpenChange,
  student,
  markAttendance,
  setSelectedSessionId,
  children,
}: {
  student: SchoolStudentTableData;
  open: boolean;
  onOpenChange: Dispatch<SetStateAction<boolean>>;
  markAttendance: Dispatch<SetStateAction<boolean>>;
  setSelectedSessionId: Dispatch<SetStateAction<string | undefined>>;
  children: React.ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="lg:w-3/5 lg:max-w-none">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            Student session attendance history
          </DialogTitle>
        </DialogHeader>
        {children}
        <DataTable
          columns={columns(markAttendance, setSelectedSessionId)}
          editColumns={false}
          data={student.studentAttendances ?? []}
          emptyStateMessage={"No attendance records found"}
          className="data-table lg:mt-4"
        />
        <DialogFooter className="flex justify-end gap-2">
          <Button onClick={() => onOpenChange(false)} className="flex items-center gap-2">
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const columns = (
  markAttendance: Dispatch<SetStateAction<boolean>>,
  setSelectedSessionId: Dispatch<SetStateAction<string | undefined>>,
): ColumnDef<SchoolStudentTableData["studentAttendances"][number]>[] => [
  {
    id: "Date of attendance",
    header: "Date of attendance",
    accessorFn: (row) => {
      return row.session && format(row.session.sessionDate, "dd MMM yyyy");
    },
    sortingFn: sortBy((attendance) => attendance.session?.sessionDate),
  },
  {
    header: "Session",
    id: "session",
    cell: ({ row }) => {
      const session = row.original.session;
      return <span>{sessionDisplayName(session?.session?.sessionName)}</span>;
    },
  },
  {
    header: "Group",
    id: "Group",
    accessorKey: "group.groupName",
  },
  {
    header: "Attendance",
    id: "attendance",
    cell: ({ row }) => {
      const attended = row.original.attended;
      return (
        <div className="flex">
          <div
            className={cn(
              "flex items-center rounded-lg border px-1.5 py-0.5",
              {
                "border-success-border": attended,
                "border-destructive-border": !attended,
                "border-info-border": attended === undefined || attended === null,
              },
              {
                "bg-success-bg": attended,
                "bg-destructive-bg": !attended,
                "bg-info-bg": attended === undefined || attended === null,
              },
            )}
          >
            {attended === null || attended === undefined ? (
              <div className="flex items-center gap-1 text-info">
                <Icons.helpCircle className="h-3 w-3" strokeWidth={2.5} />
                <span>Not marked</span>
              </div>
            ) : attended ? (
              <div className="flex items-center gap-1 text-success">
                <Icons.checkCircle className="h-3 w-3" strokeWidth={2.5} />
                <span>Attended</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-destructive">
                <Icons.crossCircleFilled className="h-3 w-3" strokeWidth={2.5} />
                <span>Missed</span>
              </div>
            )}
          </div>
        </div>
      );
    },
  },
  {
    id: "button",
    cell: ({ row }) => (
      <DropdownMenu>
        <RowActionsTrigger
          label={`Actions for ${sessionDisplayName(row.original.session?.session?.sessionName)}`}
          className="bg-white"
        />
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>
            <span className="text-xs font-medium uppercase text-muted-foreground">Actions</span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => {
              setSelectedSessionId(row.original.sessionId);
              markAttendance(true);
            }}
          >
            Mark student attendance
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
    enableHiding: false,
  },
];
