"use client";

import type { ImplementerRole, Prisma } from "@prisma/client";
import type { ColumnDef } from "@tanstack/react-table";
import { format, isAfter } from "date-fns";
import RenderParsedPhoneNumber from "#/components/common/render-parsed-phone-number";
import SchoolTableDropdown from "#/components/common/schools/school-table-dropdown";
import { Badge } from "#/components/ui/badge";
import { Checkbox } from "#/components/ui/checkbox";
import { sessionDisplayName } from "#/lib/utils";

export type SchoolsTableData = Prisma.SchoolGetPayload<{
  include: {
    assignedSupervisor: true;
    interventionSessions: {
      include: {
        sessionRatings: true;
        session: true;
      };
    };
    students: {
      include: {
        assignedGroup: true;
        _count: {
          select: {
            clinicalCases: true;
          };
        };
      };
    };
  };
}>;

export const columns = ({ role }: { role: ImplementerRole }): ColumnDef<SchoolsTableData>[] => {
  const defaultColumns: ColumnDef<SchoolsTableData>[] = [
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
      accessorKey: "schoolName",
      header: "School name",
      id: "School name",
    },
    {
      header: "School ID",
      id: "School ID",
      accessorKey: "visibleId",
    },
    // TODO: computed school ranking
    // {
    //   accessorKey: "schoolRating",
    //   header: "School rating",
    // },
    {
      accessorKey: "schoolCounty",
      header: "County",
      id: "County",
    },
    {
      accessorKey: "schoolSubCounty",
      header: "Sub - county",
      id: "Sub - county",
    },
    // {
    //   // TODO: fetch and display clinical cases
    //   accessorKey: "clinicalCases",
    //   header: "Clinical cases",
    // },
    {
      header: "Point teacher",
      accessorKey: "pointPersonName",
      id: "Point teacher",
    },
    {
      header: "Point teacher phone no.",
      id: "Point teacher phone no.",
      accessorKey: "pointPersonPhone",
      accessorFn: (row) => RenderParsedPhoneNumber(row.pointPersonPhone ?? undefined),
    },
    {
      // TODO: this computation should be done during the fetch and possible user an accessor Function
      accessorKey: "numbersExpected",
      header: "Expected number of students",
      id: "Expected number of students",
    },
    {
      accessorFn: (row) => row.assignedSupervisor?.supervisorName,
      header: "Point supervisor",
      id: "Point supervisor",
    },
    {
      header: "Point supervisor phone no.",
      id: "Point supervisor phone no.",
      accessorFn: (row) => RenderParsedPhoneNumber(row.assignedSupervisor?.cellNumber ?? undefined),
    },
    {
      header: "Point supervisor email",
      id: "Point supervisor email",
      accessorFn: (row) => row.assignedSupervisor?.supervisorEmail,
    },
    {
      header: "Upcoming session",
      id: "Upcoming session",
      accessorFn: (row) => {
        const upcomingSessions = row.interventionSessions
          .filter((session) => {
            return isAfter(session.sessionDate, new Date());
          })
          .sort((a, b) => {
            return a.sessionDate.getTime() - b.sessionDate.getTime();
          });

        if (upcomingSessions.length > 0) {
          return (
            sessionDisplayName(upcomingSessions[0]!.session?.sessionName) +
            " - " +
            format(upcomingSessions[0]!.sessionDate, "dd MMM yyyy")
          );
        }
        return null;
      },
    },
    {
      header: "Report submission",
      id: "Report submission",
      cell: ({ row }) => {
        const sessions = row.original.interventionSessions
          .filter((session) => {
            return session.occurred;
          })
          .sort((a, b) => {
            return a.sessionDate.getTime() - b.sessionDate.getTime();
          });

        // TODO: refactor session names
        if (sessions.length > 0) {
          const recent = sessions[sessions.length - 1];
          if (recent && recent.sessionRatings.length > 0) {
            return (
              <Badge variant="shamiri-green">
                {sessionDisplayName(sessions[sessions.length - 1]!.session?.sessionName) +
                  " - Report submitted"}
              </Badge>
            );
          }
          return (
            <Badge variant="destructive">
              {`${sessions[sessions.length - 1]?.sessionType?.toUpperCase()} - Not submitted`}
            </Badge>
          );
        }
        return <Badge variant="destructive">No report submitted</Badge>;
      },
    },
    {
      header: "Date added",
      id: "Date added",
      accessorFn: (row) => format(row.createdAt, "dd/MM/yyyy"),
    },
    {
      header: "Type",
      id: "Type",
      accessorKey: "schoolType",
    },
    {
      header: "Active status",
      cell: ({ row }) =>
        row.original.archivedAt || row.original.droppedOut ? (
          <Badge variant="destructive">Inactive</Badge>
        ) : (
          <Badge variant="shamiri-green">Active</Badge>
        ),
    },
    {
      id: "button",
      cell: ({ row }) => <SchoolTableDropdown schoolRow={row.original} role={role} />,
      enableHiding: false,
    },
  ];

  return defaultColumns.filter((column) => {
    if (role === "FELLOW") {
      const ids = ["Point teacher", "Point teacher phone no.", "Report submission"];
      return column.id && !ids.includes(column.id);
    }

    return column;
  });
};
