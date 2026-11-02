"use client";

import type { ImplementerRole } from "#/db/enums";
import type { ColumnDef } from "@tanstack/react-table";
import { format, isAfter } from "date-fns";
import type { fetchSchoolData } from "#/app/(platform)/hc/schools/actions";
import RenderParsedPhoneNumber from "#/components/common/render-parsed-phone-number";
import SchoolTableDropdown from "#/components/common/schools/school-table-dropdown";
import { Badge } from "#/components/ui/badge";
import { sortBy } from "#/lib/table-view";
import { sessionDisplayName } from "#/lib/utils";

export type SchoolsTableData = Awaited<ReturnType<typeof fetchSchoolData>>[number];

export type SchoolDialogKind = "edit" | "pointSupervisor" | "dropout" | "undoDropout";

export type SchoolTableState = {
  openDialog: (kind: SchoolDialogKind, school: SchoolsTableData) => void;
};

function nextUpcomingSession(school: SchoolsTableData) {
  return school.interventionSessions
    .filter((session) => isAfter(session.sessionDate, new Date()))
    .toSorted((a, b) => a.sessionDate.getTime() - b.sessionDate.getTime())[0];
}

export const columns = ({
  role,
  state,
}: {
  role: ImplementerRole;
  state: SchoolTableState;
}): ColumnDef<SchoolsTableData>[] => {
  const defaultColumns: ColumnDef<SchoolsTableData>[] = [
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
      // An invalid number renders as a warning element, not text.
      enableSorting: false,
    },
    {
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
      // An invalid number renders as a warning element, not text.
      enableSorting: false,
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
        const firstUpcoming = nextUpcomingSession(row);
        if (firstUpcoming) {
          return `${sessionDisplayName(firstUpcoming.session?.sessionName)} - ${format(
            firstUpcoming.sessionDate,
            "dd MMM yyyy",
          )}`;
        }
        return null;
      },
      sortingFn: sortBy((school) => nextUpcomingSession(school)?.sessionDate),
    },
    {
      header: "Report submission",
      id: "Report submission",
      cell: ({ row }) => {
        const sessions = row.original.interventionSessions
          .filter((session) => {
            return session.occurred;
          })
          .toSorted((a, b) => {
            return a.sessionDate.getTime() - b.sessionDate.getTime();
          });

        if (sessions.length > 0) {
          const recent = sessions[sessions.length - 1];
          if (recent && recent.sessionRatingsCount > 0) {
            return (
              <Badge variant="shamiri-green">
                {`${sessionDisplayName(recent.session?.sessionName)} - Report submitted`}
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
      sortingFn: sortBy((school) => school.createdAt),
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
      cell: ({ row }) => <SchoolTableDropdown schoolRow={row.original} role={role} state={state} />,
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
