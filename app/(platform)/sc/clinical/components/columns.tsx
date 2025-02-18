"use client";

import { ClinicalCases } from "#/app/(platform)/sc/clinical/action";
import ClinicalCaseActionsDropdownMenu from "#/app/(platform)/sc/clinical/components/clinical-case-actions-dropdown";
import { cn } from "#/lib/utils";
import { Icons } from "#/components/icons";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "#/components/ui/dropdown-menu";
import { ColumnDef } from "@tanstack/react-table";

export const attendanceColumns: ColumnDef<ClinicalCases>[] = [
  
  // session: "Clinical S1",
  // sessionDate: "2024-01-01",
  // attendanceStatus: true,
  {
    accessorKey: "session",
    header: "Session",
  },
  {
    accessorKey: "sessionDate",
    header: "Date",
  },
  {
    accessorKey: "attendanceStatus",
    header: "Attendance",
    cell: ( props) => {
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
    cell: ({ row }) => (
      <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div className="absolute inset-0 border-l bg-white">
          <div className="flex h-full w-full items-center justify-center">
            <Icons.moreHorizontal className="h-5 w-5 text-shamiri-text-grey" />
          </div>
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        onCloseAutoFocus={(e) => {
          e.preventDefault();
        }}
      >
        <DropdownMenuLabel>
          <span className="text-xs font-medium uppercase text-shamiri-text-grey">
            Actions
          </span>
        </DropdownMenuLabel>     
        <DropdownMenuItem>Mark attendance</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
    ),
    enableHiding: false,
  },
];


