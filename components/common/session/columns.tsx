"use client";

import { type ImplementerRole, SessionStatus } from "#/db/enums";
import type { interventionGroup, school, supervisor } from "#/db/schema";
import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { SessionDropDown } from "#/components/common/session/session-list";
import type { Session } from "#/lib/actions/fetch-sessions";
import { Icons } from "#/components/icons";
import { cn, sessionDisplayName } from "#/lib/utils";

// The school sessions pages load a school's sessions with the whole school subtree attached.
export type SessionData = Omit<Session, "school"> & {
  school:
    | (typeof school.$inferSelect & {
        assignedSupervisor: typeof supervisor.$inferSelect | null;
        interventionGroups: (typeof interventionGroup.$inferSelect)[];
      })
    | null;
};

export type SessionDialogKind =
  | "ratings"
  | "fellowAttendance"
  | "supervisorAttendance"
  | "studentAttendance"
  | "sessionOccurrence"
  | "reschedule"
  | "cancel"
  | "attendanceDocument";

export const columns = (state: {
  role: ImplementerRole;
  openDialog: (kind: SessionDialogKind, session: SessionData) => void;
  fellowId?: string;
  supervisorId?: string;
}): ColumnDef<SessionData>[] => [
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
    id: "Session type",
    accessorFn: (row) => sessionDisplayName(row.session?.sessionName),
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
              "select-none rounded-lg border px-1.5 py-0.5",
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
                    <Icons.checkCircle className="h-3.5 w-3.5" strokeWidth={2.5} />
                    <span>Attended</span>
                  </div>
                )}
                {!completed && !cancelled && (
                  <div className="flex items-center gap-1">
                    <Icons.helpCircle className="h-3.5 w-3.5" strokeWidth={2.5} />
                    <span>Not marked</span>
                  </div>
                )}
                {cancelled && (
                  <div className="flex items-center gap-1">
                    <Icons.crossCircleFilled className="h-3.5 w-3.5" strokeWidth={2.5} />
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
    cell: ({ row }) => {
      // SessionDropDown, shared with the schedule views, opens a dialog by calling its setter.
      const opens = (kind: SessionDialogKind) => () => state.openDialog(kind, row.original);
      return (
        <SessionDropDown
          state={{
            session: row.original,
            setRatingsDialog: opens("ratings"),
            setFellowAttendanceDialog: opens("fellowAttendance"),
            setStudentAttendanceDialog: opens("studentAttendance"),
            setSupervisorAttendanceDialog: opens("supervisorAttendance"),
            setSessionOccurrenceDialog: opens("sessionOccurrence"),
            setRescheduleSessionDialog: opens("reschedule"),
            setCancelSessionDialog: opens("cancel"),
            setAttendanceDocumentDialog: opens("attendanceDocument"),
          }}
          role={state.role}
          fellowId={state.fellowId}
          supervisorId={state.supervisorId}
        >
          <div className="absolute inset-0 border-l bg-white">
            <div className="flex h-full w-full items-center justify-center">
              <Icons.moreHorizontal className="h-5 w-5" />
            </div>
          </div>
        </SessionDropDown>
      );
    },
    enableHiding: false,
  },
];
