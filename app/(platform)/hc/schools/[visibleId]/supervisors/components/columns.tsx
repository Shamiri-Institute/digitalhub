"use client";

import SessionHistoryWidget from "#/app/(platform)/hc/schools/[visibleId]/supervisors/components/sessions-history-widget";
import { SupervisorsDataTableMenu } from "#/app/(platform)/hc/schools/[visibleId]/supervisors/components/supervisors-datatable";
import { Badge } from "#/components/ui/badge";
import { Checkbox } from "#/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuPortal,
  DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import { InterventionSessionType } from "#/lib/app-constants/constants";
import { Prisma } from "@prisma/client";
import { ColumnDef } from "@tanstack/react-table";
import { parsePhoneNumber } from "libphonenumber-js";

export type SupervisorsData = Prisma.SupervisorGetPayload<{
  include: {
    assignedSchools: true;
    fellows: true;
    supervisorAttendances: {
      include: {
        session: true;
      };
    };
  };
}>;

export const columns: ColumnDef<SupervisorsData>[] = [
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
              <DropdownMenuTrigger asChild>
                <span className="ml-2 cursor-pointer select-none text-shamiri-new-blue">
                  +{schools?.length - 1}
                </span>
              </DropdownMenuTrigger>
              <DropdownMenuPortal>
                <DropdownMenuContent>
                  <div className="flex flex-col gap-y-2 px-2 py-1 text-sm">
                    {schools.slice(1).map((school, index) => {
                      return (
                        <span key={index.toString()}>{school.schoolName}</span>
                      );
                    })}
                  </div>
                </DropdownMenuContent>
              </DropdownMenuPortal>
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
      const attendedSessions: {
        [key in InterventionSessionType]: boolean | null;
      } = {};
      row.original.supervisorAttendances.forEach((attendance) => {
        attendedSessions[
          attendance.session.sessionType as keyof typeof attendedSessions
        ] = attendance.attended;
      });
      return <SessionHistoryWidget attendedSessions={attendedSessions} />;
    },
  },
  {
    header: "Status",
    cell: ({ row }) =>
      row.original.archivedAt || row.original.droppedOut ? (
        <Badge variant="destructive">Inactive</Badge>
      ) : (
        <Badge variant="shamiri-green">Active</Badge>
      ),
  },
  {
    header: "No. of fellows",
    id: "No. of fellows",
    cell: ({ row }) => {
      const activeFellows = row.original.fellows.filter(
        (fellow) => !fellow.droppedOut,
      );
      return activeFellows.length + "/" + row.original.fellows.length;
    },
  },
  {
    header: "Phone Number",
    id: "Phone number",
    accessorFn: (row) => {
      return (
        row.cellNumber &&
        parsePhoneNumber(row.cellNumber, "KE").formatNational()
      );
    },
  },
  {
    header: "Gender",
    id: "Gender",
    accessorKey: "gender",
  },
  {
    id: "button",
    cell: ({ row }) => <SupervisorsDataTableMenu supervisor={row.original} />,
    enableHiding: false,
  },
];
