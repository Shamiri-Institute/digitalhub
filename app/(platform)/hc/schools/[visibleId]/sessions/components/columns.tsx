"use client";

import { SessionDropDown } from "#/components/common/session/session-list";
import { Icons } from "#/components/icons";
import { Checkbox } from "#/components/ui/checkbox";
import { cn, sessionDisplayName } from "#/lib/utils";
import { ImplementerRole, Prisma, SessionStatus } from "@prisma/client";
import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { Dispatch, SetStateAction } from "react";

export type SessionData = Prisma.InterventionSessionGetPayload<{
  include: {
    school: {
      include: {
        assignedSupervisor: true;
      };
    };
    sessionRatings: true;
  };
}>;

export const columns = (state: {
  role: ImplementerRole;
  setRatingsDialog: Dispatch<SetStateAction<boolean>>;
  setFellowAttendanceDialog: Dispatch<SetStateAction<boolean>>;
  setSession: Dispatch<
    SetStateAction<
      | Prisma.InterventionSessionGetPayload<{
          include: {
            school: true;
            sessionRatings: true;
          };
        }>
      | undefined
    >
  >;
}): ColumnDef<SessionData>[] => [
  {
    id: "checkbox",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(val) => table.toggleAllPageRowsSelected(!!val)}
        aria-label="Select all"
        className={
          "h-5 w-5 border-shamiri-light-grey bg-white data-[state=checked]:bg-shamiri-new-blue"
        }
      />
    ),
    cell: ({ row }) => {
      return (
        <div className="flex items-center justify-center">
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(val) => row.toggleSelected(!!val)}
            aria-label="Select row"
            className={
              "h-5 w-5 border-shamiri-light-grey bg-white data-[state=checked]:bg-shamiri-new-blue"
            }
          />
        </div>
      );
    },
    enableSorting: false,
    enableHiding: false,
  },
  {
    header: "Date of attendance",
    id: "Date of attendance",
    cell: ({ row }) => {
      return format(row.original.sessionDate, "dd MMM yyyy");
    },
  },
  {
    header: "Last updated",
    id: "Last updated",
    cell: ({ row }) => {
      return format(row.original.updatedAt, "dd MMM yyyy");
    },
  },
  {
    header: "Session type",
    cell: ({ row }) => {
      return sessionDisplayName(row.original.sessionType!);
    },
  },
  {
    header: "Assigned supervisor",
    id: "Assigned supervisor",
    accessorKey: "school.assignedSupervisor.supervisorName",
  },
  {
    header: "Session status",
    cell: ({ row }) => {
      const completed = row.original.occurred;
      const cancelled = row.original.status === SessionStatus.Cancelled;
      return (
        <div className="flex">
          <div
            className={cn(
              "select-none rounded-[0.25rem] border px-1.5 py-0.5",
              {
                "border-green-border": completed,
                "border-blue-border": !completed,
                "border-red-border": cancelled,
              },
              {
                "bg-green-bg": completed,
                "bg-blue-bg": !completed,
                "bg-red-bg": cancelled,
              },
            )}
          >
            <div
              className={cn("text-[0.825rem] font-semibold", {
                "text-green-base": completed,
                "text-blue-base": !completed,
                "text-red-base": cancelled,
              })}
            >
              <div className="flex items-center gap-1">
                {completed && !cancelled && (
                  <div className="flex items-center gap-1">
                    <Icons.checkCircle
                      className="h-3.5 w-3.5"
                      strokeWidth={2.5}
                    />
                    <span>Attended</span>
                  </div>
                )}
                {!completed && !cancelled && (
                  <div className="flex items-center gap-1">
                    <Icons.helpCircle
                      className="h-3.5 w-3.5"
                      strokeWidth={2.5}
                    />
                    <span>Not marked</span>
                  </div>
                )}
                {cancelled && (
                  <div className="flex items-center gap-1">
                    <Icons.crossCircleFilled
                      className="h-3.5 w-3.5"
                      strokeWidth={2.5}
                    />
                    <span>Cancelled</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    },
  },
  {
    id: "button",
    cell: ({ row }) => (
      <SessionDropDown
        state={{
          session: row.original,
          setRatingsDialog: state.setRatingsDialog,
          setSession: state.setSession,
          setFellowAttendanceDialog: state.setFellowAttendanceDialog,
        }}
        role={state.role}
      >
        <div className="absolute inset-0 border-l bg-white">
          <div className="flex h-full w-full items-center justify-center">
            <Icons.moreHorizontal className="h-5 w-5" />
          </div>
        </div>
      </SessionDropDown>
    ),
    enableHiding: false,
  },
];
