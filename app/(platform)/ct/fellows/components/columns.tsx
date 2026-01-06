"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { FellowClinicalCasesData } from "#/app/(platform)/ct/fellows/actions";
import FellowsClinicalCasesDropdownActions from "#/app/(platform)/ct/fellows/components/fellows-cases-dropdown-actions";
import { Badge } from "#/components/ui/badge";

export const columns: ColumnDef<FellowClinicalCasesData>[] = [
  {
    accessorKey: "fellowName",
    header: "Name",
  },
  {
    accessorKey: "averageRating",
    header: "Average Rating",
  },
  {
    accessorKey: "activeStatus",
    header: "Active Status",
    cell: ({ row }) => {
      return (
        <Badge variant={colors[row.original.activeStatus] || "shamiri-green"}>
          {row.original.activeStatus}
        </Badge>
      );
    },
  },
  {
    accessorKey: "casesReferred",
    header: "Cases Referred",
    cell: ({ row }) => {
      return (
        <div className="flex items-center gap-2 text-shamiri-black">
          {String(row.original.casesReferred || 0)}
        </div>
      );
    },
  },
  {
    accessorKey: "noOfGroups",
    header: "No. of Groups",
  },
  {
    accessorKey: "phoneNumber",
    header: "Phone Number",
  },
  {
    accessorKey: "supervisorName",
    header: "Supervisor",
  },
  {
    id: "button",
    cell: () => <FellowsClinicalCasesDropdownActions />,
    enableHiding: false,
  },
];

type BadgeVariant =
  | "destructive"
  | "warning"
  | "shamiri-green"
  | "default"
  | "secondary"
  | "outline-solid";

const colors: Record<string, BadgeVariant> = {
  Active: "shamiri-green",
  FollowUp: "warning",
  Referred: "destructive",
  Terminated: "destructive",
  Low: "shamiri-green",
  Mid: "warning",
  High: "destructive",
  Severe: "destructive",
  No: "shamiri-green",
  Medium: "warning",
};
