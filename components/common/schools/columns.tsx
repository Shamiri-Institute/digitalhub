"use client";

import type { ImplementerRole, Prisma } from "@prisma/client";
import type { ColumnDef } from "@tanstack/react-table";
import { format, isAfter } from "date-fns";
import type { Dispatch, SetStateAction } from "react";
import RenderParsedPhoneNumber from "#/components/common/render-parsed-phone-number";
import SchoolTableDropdown from "#/components/common/schools/school-table-dropdown";
import { Badge } from "#/components/ui/badge";
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

export const columns = ({
  role,
  state,
}: {
  role: ImplementerRole;
  state: {
    editDialog: boolean;
    setEditDialog: Dispatch<SetStateAction<boolean>>;
    pointSupervisorDialog: boolean;
    setPointSupervisorDialog: Dispatch<SetStateAction<boolean>>;
    schoolDropOutDialog: boolean;
    setSchoolDropOutDialog: Dispatch<SetStateAction<boolean>>;
    undoDropOutDialog: boolean;
    setUndoDropOutDialog: Dispatch<SetStateAction<boolean>>;
    school: SchoolsTableData | null;
    setSchool: Dispatch<SetStateAction<SchoolsTableData | null>>;
  };
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

        const firstUpcoming = upcomingSessions[0];
        if (firstUpcoming) {
          return (
            sessionDisplayName(firstUpcoming.session?.sessionName) +
            " - " +
            format(firstUpcoming.sessionDate, "dd MMM yyyy")
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
