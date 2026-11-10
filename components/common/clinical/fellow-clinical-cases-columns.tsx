"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { FellowClinicalCasesData } from "#/app/(platform)/cl/fellows/actions";
import { Badge } from "#/components/ui/badge";

export const columns: ColumnDef<FellowClinicalCasesData>[] = [
  {
    accessorKey: "fellowName",
    header: "Name",
  },
  {
    accessorKey: "averageRating",
    header: "Average Rating",
    meta: { numeric: true },
  },
  {
    accessorKey: "activeStatus",
    header: "Active Status",
    cell: ({ row }) => {
      return (
        <Badge variant={colors[row.original.activeStatus] || "success"}>
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
        <div className="flex items-center gap-2 text-foreground">
          {String(row.original.casesReferred || 0)}
        </div>
      );
    },
  },
  {
    accessorKey: "noOfGroups",
    header: "No. of Groups",
    meta: { numeric: true },
  },
  {
    accessorKey: "phoneNumber",
    header: "Phone Number",
  },
  {
    accessorKey: "supervisorName",
    header: "Supervisor",
  },
];

type BadgeVariant = "destructive" | "warning" | "success" | "default" | "secondary" | "outline";

const colors: Record<string, BadgeVariant> = {
  Active: "success",
  FollowUp: "warning",
  Referred: "destructive",
  Terminated: "destructive",
  Low: "success",
  Mid: "warning",
  High: "destructive",
  Severe: "destructive",
  No: "success",
  Medium: "warning",
};
