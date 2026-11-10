"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import HandleSessionAttendanceUpdate from "#/app/(platform)/sc/clinical/components/handle-session-attendance-update";
import { Icons } from "#/components/icons";
import { sortBy } from "#/lib/table-view";
import { cn } from "#/lib/utils";

export type AttendanceRecord = {
  sessionId: string;
  session: string;
  sessionDate: string;
  attendanceStatus: boolean | null;
};

export const attendanceColumns: ColumnDef<AttendanceRecord>[] = [
  {
    accessorKey: "session",
    header: "Session",
  },
  {
    accessorKey: "sessionDate",
    header: "Date",
    cell: ({ row }) => format(new Date(row.original.sessionDate), "dd MMM yyyy"),
    sortingFn: sortBy((attendance) => new Date(attendance.sessionDate)),
  },
  {
    accessorKey: "attendanceStatus",
    header: "Attendance",
    cell: (props) => {
      const attended = props.getValue();
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
    cell: ({ row }) => {
      return <HandleSessionAttendanceUpdate row={row} />;
    },
    enableHiding: false,
  },
];
