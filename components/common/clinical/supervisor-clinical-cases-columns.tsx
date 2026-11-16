"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { SupervisorClinicalCasesData } from "#/app/(platform)/cl/supervisors/actions";
import { Badge } from "#/components/ui/badge";

export const columns: ColumnDef<SupervisorClinicalCasesData>[] = [
  {
    accessorKey: "supervisorName",
    header: "Supervisor Name",
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
    accessorKey: "noOfClinicalCases",
    header: "No. of Clinical Cases",
    meta: { numeric: true },
  },
  {
    accessorKey: "noOfTreatmentPlans",
    header: "No. of Treatment Plans",
    meta: { numeric: true },
  },
  {
    accessorKey: "noOfCaseNotes",
    header: "No. of Case Notes",
    meta: { numeric: true },
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
