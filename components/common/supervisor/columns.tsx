"use client";

import type {
  fellow,
  interventionSession,
  school,
  supervisor,
  supervisorAttendance,
} from "#/db/schema";
import type { ColumnDef } from "@tanstack/react-table";
import { parsePhoneNumberWithError } from "libphonenumber-js";
import SessionHistoryWidget from "#/components/common/supervisor/sessions-history-widget";
import { SupervisorsDataTableMenu } from "#/components/common/supervisor/supervisors-datatable-menu";
import { Badge } from "#/components/ui/badge";
import { Checkbox } from "#/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";

// The row shape `SchoolSupervisorsPage` loads.
export type SupervisorsData = Pick<
  typeof supervisor.$inferSelect,
  "id" | "supervisorName" | "cellNumber" | "gender" | "archivedAt" | "droppedOut"
> & {
  assignedSchools: Pick<typeof school.$inferSelect, "schoolName">[];
  fellows: Pick<typeof fellow.$inferSelect, "droppedOut">[];
  supervisorAttendances: (Pick<
    typeof supervisorAttendance.$inferSelect,
    "id" | "supervisorId" | "attended" | "absenceReason" | "absenceComments" | "sessionId"
  > & {
    session: Pick<typeof interventionSession.$inferSelect, "schoolId">;
  })[];
};

export type SupervisorTableState = {
  openMarkAttendance: (supervisor: SupervisorsData) => void;
  sessions: (typeof interventionSession.$inferSelect)[];
};

export const columns = (state: SupervisorTableState): ColumnDef<SupervisorsData>[] => [
  {
    id: "checkbox",
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected()}
        indeterminate={table.getIsSomePageRowsSelected()}
        onCheckedChange={(val) => table.toggleAllPageRowsSelected(!!val)}
        aria-label="Select all"
        className={"h-5 w-5"}
      />
    ),
    cell: ({ row }) => {
      return (
        <div className="flex items-center justify-center">
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(val) => row.toggleSelected(!!val)}
            aria-label="Select row"
            className={"h-5 w-5"}
          />
        </div>
      );
    },
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "supervisorName",
    header: "Name",
    id: "Name",
  },

  {
    header: "Assigned school",
    cell: ({ row }) => {
      const schools = row.original.assignedSchools;

      if (schools.length === 0) {
        return null;
      }

      if (schools.length > 1) {
        return (
          <div className="relative flex items-center">
            <span>{schools[0]?.schoolName},</span>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <button
                    type="button"
                    aria-label={`${schools.length - 1} more schools`}
                    className="ml-2 cursor-pointer select-none rounded-sm text-primary hover:underline"
                  >
                    +{schools.length - 1}
                  </button>
                }
              />
              <DropdownMenuContent>
                <div className="flex flex-col gap-y-2 px-2 py-1 text-sm">
                  {schools.slice(1).map((school, index) => {
                    // oxlint-disable-next-line react/no-array-index-key -- static display list
                    return <span key={index.toString()}>{school.schoolName}</span>;
                  })}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      }
      return <span>{schools[0]?.schoolName}</span>;
    },
  },
  {
    header: "Attendance history",
    cell: ({ row }) => {
      const attendances = state.sessions.map((session) => {
        const attendance = row.original.supervisorAttendances.find(
          (x) => x.sessionId === session?.id,
        );
        return {
          id: attendance?.id,
          attended: attendance?.attended ?? null,
          sessionId: attendance?.sessionId,
          absenceReason: attendance?.absenceReason ?? "",
          absenceComments: attendance?.absenceComments ?? "",
          sessionType: session.sessionType ?? null,
          sessionOccurred: session.occurred,
          sessionDate: session.sessionDate,
        };
      });
      return <SessionHistoryWidget attendedSessions={attendances} />;
    },
  },
  {
    header: "Status",
    cell: ({ row }) =>
      row.original.archivedAt || row.original.droppedOut ? (
        <Badge variant="destructive">Inactive</Badge>
      ) : (
        <Badge variant="success">Active</Badge>
      ),
  },
  {
    header: "No. of fellows",
    meta: { numeric: true },
    id: "No. of fellows",
    cell: ({ row }) => {
      const activeFellows = row.original.fellows.filter((fellow) => !fellow.droppedOut);
      return `${activeFellows.length}/${row.original.fellows.length}`;
    },
  },
  {
    header: "Phone Number",
    id: "Phone number",
    accessorFn: (row) => {
      try {
        return row.cellNumber && parsePhoneNumberWithError(row.cellNumber, "KE").formatNational();
      } catch {
        return row.cellNumber;
      }
    },
  },
  {
    header: "Gender",
    id: "Gender",
    accessorKey: "gender",
  },
  {
    id: "button",
    cell: ({ row }) => <SupervisorsDataTableMenu state={state} supervisor={row.original} />,
    enableHiding: false,
  },
];
