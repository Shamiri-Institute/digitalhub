"use client";

import type { SchoolStudentTableData } from "#/components/common/student/columns";
import DataTable from "#/components/data-table";
import { Icons } from "#/components/icons";
import { Button } from "#/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
} from "#/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import { cn, sessionDisplayName } from "#/lib/utils";
import type { Prisma } from "@prisma/client";
import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { type Dispatch, type SetStateAction, useEffect } from "react";

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
  useEffect(() => {
    if (!open) {
      setSelectedSessionId(undefined);
    }
  }, [open, setSelectedSessionId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="lg:w-3/5 lg:max-w-none">
        <DialogHeader>
          <h2 className="text-xl font-bold">
            Student session attendance history
          </h2>
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
          <Button
            variant="brand"
            onClick={() => {
              onOpenChange(false);
            }}
            className="flex items-center gap-2"
          >
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
): ColumnDef<
  Prisma.StudentAttendanceGetPayload<{
    include: {
      session: {
        include: {
          session: true;
        };
      };
      group: true;
    };
  }>
>[] => [
  {
    id: "Date of attendance",
    header: "Date of attendance",
    accessorFn: (row) => {
      return row.session && format(row.session.sessionDate, "dd MMM yyyy");
    },
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
              "flex items-center rounded-[0.25rem] border px-1.5 py-0.5",
              {
                "border-green-border": attended,
                "border-red-border": !attended,
                "border-blue-border":
                  attended === undefined || attended === null,
              },
              {
                "bg-green-bg": attended,
                "bg-red-bg": !attended,
                "bg-blue-bg": attended === undefined || attended === null,
              },
            )}
          >
            {attended === null || attended === undefined ? (
              <div className="flex items-center gap-1 text-blue-base">
                <Icons.helpCircle className="h-3 w-3" strokeWidth={2.5} />
                <span>Not marked</span>
              </div>
            ) : attended ? (
              <div className="flex items-center gap-1 text-green-base">
                <Icons.checkCircle className="h-3 w-3" strokeWidth={2.5} />
                <span>Attended</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-red-base">
                <Icons.crossCircleFilled
                  className="h-3 w-3"
                  strokeWidth={2.5}
                />
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
        <DropdownMenuTrigger asChild={true}>
          <div className="absolute inset-0 border-l bg-white">
            <div className="flex h-full w-full items-center justify-center">
              <Icons.moreHorizontal className="h-5 w-5 text-shamiri-text-grey" />
            </div>
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>
            <span className="text-xs font-medium uppercase text-shamiri-text-grey">
              Actions
            </span>
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
