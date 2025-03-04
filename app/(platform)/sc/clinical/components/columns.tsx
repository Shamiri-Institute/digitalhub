"use client";

import HandleSessionAttendanceUpdate from "#/app/(platform)/sc/clinical/components/handle-session-attendance-update";
import { Icons } from "#/components/icons";
import { cn } from "#/lib/utils";
import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";

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
    cell: ({ row }) =>
      format(new Date(row.original.sessionDate), "dd MMM yyyy"),
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
    cell: ({ row }) => {
      return <HandleSessionAttendanceUpdate row={row} />;
    },
    enableHiding: false,
  },
];
