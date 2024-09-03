"use client";
import { Prisma } from "@prisma/client";
import { ColumnDef } from "@tanstack/react-table";

// export type FellowsData = {
//   id: string;
//   fellowName: string;
//   sessionsAttended: number;
//   mpesaNumber: string;
//   county: string;
//   numClinicalCases?: number;
//   nextSession?: number; // TODO: confirm this
//   groupRating: number;
//   fellowRating: number;
//   createdAt: number;
//   phoneNumber: string;
//   upcomingSessions?: {
//     schoolName: string;
//     sessionType: string;
//     groupNumber: string;
//     numStudents: string;
//   }[];
// };

export type FellowsData = Prisma.FellowGetPayload<{
  include: {
    fellowAttendances: true;
  };
}>;

export const columns: ColumnDef<FellowsData>[] = [
  {
    id: "button",
    cell: ({ row }) => {
      return (
        <button
          onClick={row.getToggleExpandedHandler()}
          className="cursor-pointer"
        >
          {row.getIsExpanded() ? "▼" : "▶"}
        </button>
      );
    },
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "fellowName",
    header: "Name",
  },
  {
    accessorKey: "mpesaNumber",
    header: "MPESA Number",
  },
  {
    accessorKey: "county",
    header: "County",
  },
  {
    accessorKey: "subCounty",
    header: "Sub County",
  },
];
